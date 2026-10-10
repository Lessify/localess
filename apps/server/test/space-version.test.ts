import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces } from '../src/infra/database/schema.js';
import { bumpVersion } from '../src/infra/http/space-access.js';
import { seedContent, seedSpace, TOKEN_PUBLIC } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';
import { C, S1 } from './ids.js';

/** `cv` must never repeat: caches keep a `cv` URL for 7 days, so a reused number serves another timeline's content. */
describe('space cache versions (cv)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
  });

  afterAll(() => t?.close());

  const versions = async () => {
    const [row] = await t.db.select().from(spaces).where(eq(spaces.id, S1));
    return { content: row.contentVersion, translation: row.translationVersion };
  };

  it('never reuses a version after a backup restore set the counter back', async () => {
    // The live space was at 44 before its last publish (counters as they are today, before this fix ran on them).
    await t.db.update(spaces).set({ contentVersion: 44, translationVersion: 44 }).where(eq(spaces.id, S1));
    await bumpVersion(t.db, S1, 'content');
    await bumpVersion(t.db, S1, 'translation');
    const used = await versions();
    // Restore last week's backup: the counters go back.
    await t.db.update(spaces).set({ contentVersion: 40, translationVersion: 40 }).where(eq(spaces.id, S1));

    await bumpVersion(t.db, S1, 'content');
    await bumpVersion(t.db, S1, 'translation');
    const next = await versions();
    expect(next.content).toBeGreaterThan(used.content);
    expect(next.translation).toBeGreaterThan(used.translation);
  });

  it('is at least the current time in milliseconds, like the Firebase storage generation', async () => {
    const before = Date.now();
    await bumpVersion(t.db, S1, 'content');
    expect((await versions()).content).toBeGreaterThanOrEqual(before);
  });

  it('still increases on bumps within the same millisecond', async () => {
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      await bumpVersion(t.db, S1, 'content');
      seen.push((await versions()).content);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it('redirects the v1 API to the new version', async () => {
    await bumpVersion(t.db, S1, 'content');
    const { content } = await versions();
    const response = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_PUBLIC}&locale=en` });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(`cv=${content}`);
  });
});
