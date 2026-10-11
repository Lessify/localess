import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contents, spaceEnvironments, spaces, translations } from '../src/infra/database/schema.js';
import { bumpContentVersion } from '../src/shared/data-rules/content-version.js';
import { ContentsService } from '../src/modules/contents/services/contents.service.js';
import { SpacesService } from '../src/modules/spaces/services/spaces.service.js';
import { C, S1 } from './ids.js';
import { seedContent, seedSpace, seedTranslations } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';

const PAST = new Date('2024-01-01T00:00:00.000Z');

/** `updated_at` moves on every write of a row, except the writes that are not edits of it. */
describe('updated_at', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
    await seedTranslations(t);
  });
  afterAll(() => t?.close());

  it('moves on an update that does not name it', async () => {
    const [row] = await t.db.update(translations).set({ updatedAt: PAST }).where(eq(translations.spaceId, S1)).returning();
    const [updated] = await t.db.update(translations).set({ description: 'changed' }).where(eq(translations.id, row.id)).returning();
    expect(updated.updatedAt.getTime()).toBeGreaterThan(PAST.getTime());
  });

  it('stays when a document is published or unpublished: the status compares it with publishedAt', async () => {
    await t.db.update(contents).set({ updatedAt: PAST }).where(eq(contents.id, C.home));
    const updatedAt = async () => (await t.db.select().from(contents).where(eq(contents.id, C.home)))[0].updatedAt;
    await t.app.get(ContentsService).publish(S1, C.home);
    expect(await updatedAt()).toEqual(PAST);
    await t.app.get(ContentsService).unpublish(S1, C.home);
    expect(await updatedAt()).toEqual(PAST);
  });

  it('stays on the space when its content cv moves', async () => {
    await t.db.update(spaces).set({ updatedAt: PAST }).where(eq(spaces.id, S1));
    await bumpContentVersion(t.db, S1);
    expect((await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0].updatedAt).toEqual(PAST);
  });

  it('stays on environments when they are only reordered', async () => {
    const service = t.app.get(SpacesService);
    await service.createEnvironment(S1, { name: 'A', url: 'https://a.example.com' });
    const space = await service.createEnvironment(S1, { name: 'B', url: 'https://b.example.com' });
    await t.db.update(spaceEnvironments).set({ updatedAt: PAST }).where(eq(spaceEnvironments.spaceId, S1));
    await service.reorderEnvironments(S1, space.environments.map(it => it.id).reverse());
    const rows = await t.db.select().from(spaceEnvironments).where(eq(spaceEnvironments.spaceId, S1));
    expect(rows.map(it => it.updatedAt)).toEqual(rows.map(() => PAST));
  });
});
