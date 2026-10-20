import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { spaceLocales, spaces } from '../src/infra/database/schema.js';
import { transaction } from '../src/infra/database/transaction.js';
import { SpaceLookupRepository } from '../src/shared/repositories/space-lookup.repository.js';
import { toPublicSpace } from '../src/shared/transformers/space.transformer.js';
import { S1, S2 } from './ids.js';
import { createTestApp, TestApp } from './test-app.js';

// The space every module reads (`SpaceLookupRepository`): a relational read of the space with its default locale and
// its locales, in position order (ties by when they were added), and the v1 shape built from it.

describe('SpaceLookupRepository', () => {
  let t: TestApp;
  let lookup: SpaceLookupRepository;

  beforeAll(async () => {
    t = await createTestApp();
    lookup = t.app.get(SpaceLookupRepository);
    await t.db.insert(spaces).values({ id: S1, name: 'Shop', defaultLocaleId: 'en' });
    // `de` and `ro` share a position (old data): `de` was added first, so it comes first.
    await t.db.insert(spaceLocales).values([
      { spaceId: S1, localeId: 'en', position: 0, createdAt: new Date('2026-01-01T00:00:00Z') },
      { spaceId: S1, localeId: 'de', position: 1, createdAt: new Date('2026-01-02T00:00:00Z') },
      { spaceId: S1, localeId: 'ro', position: 1, createdAt: new Date('2026-01-03T00:00:00Z') },
    ]);
  });

  afterAll(() => t?.close());

  it('reads the space with its default locale and its locales in position order, ties by when they were added', async () => {
    const space = await lookup.findOne(S1);
    expect(space?.defaultLocale.id).toBe('en');
    expect(space?.spaceLocales.map(it => it.locale.id)).toEqual(['en', 'de', 'ro']);
  });

  it('answers undefined and false for an unknown space or an id that is not a UUID', async () => {
    expect(await lookup.findOne(S2)).toBeUndefined();
    expect(await lookup.findOne('not-a-uuid')).toBeUndefined();
    expect(await lookup.exists(S1)).toBe(true);
    expect(await lookup.exists(S2)).toBe(false);
    expect(await lookup.exists('not-a-uuid')).toBe(false);
  });

  it('reads inside the caller’s transaction', async () => {
    await transaction(t.db, undefined, async tx => {
      await tx.insert(spaces).values({ id: S2, name: 'Draft', defaultLocaleId: 'en' });
      expect((await lookup.findOne(S2, tx))?.name).toBe('Draft');
      expect(await lookup.exists(S2, tx)).toBe(true);
      await tx.delete(spaces).where(eq(spaces.id, S2));
    });
  });

  it('builds the v1 space exactly as before: id, name, locales {id, name} in order, default locale, ISO dates', async () => {
    const space = (await lookup.findOne(S1))!;
    expect(toPublicSpace(space)).toEqual({
      id: S1,
      name: 'Shop',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
        { id: 'ro', name: 'Romanian' },
      ],
      defaultLocale: { id: 'en', name: 'English' },
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    });
  });
});
