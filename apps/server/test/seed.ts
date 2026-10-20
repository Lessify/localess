import { createHash } from 'node:crypto';

import { type ContentDocumentStorage, SchemaFieldKind, TokenType } from '@localess/shared';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contents, contentSnapshots, schemas, tokens, translations, translationSnapshots } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { newApiToken, tokenColumns } from '../src/shared/utils/api-token-format.js';
import { C, S1 } from './ids.js';
import { insertSpace, type TestApp } from './test-app.js';

export const TOKEN_PUBLIC = newApiToken(TokenType.PUBLIC);
/** Preview, default redirect TTL: reads published and drafts. */
export const TOKEN_READ = newApiToken(TokenType.PREVIEW);
/** Preview with a 30-second redirect TTL. */
export const TOKEN_DRAFT = newApiToken(TokenType.PREVIEW);
export const TOKEN_MANAGEMENT = newApiToken(TokenType.MANAGEMENT);
export const TOKEN_NO_CACHE = newApiToken(TokenType.PUBLIC);

/** A `tokens` row for `value`. */
export const tokenRow = (spaceId: string, type: TokenType, value: string, name: string, cacheTtl: number | null = null) => ({
  id: newUuid(),
  spaceId,
  type,
  name,
  cacheTtl,
  ...tokenColumns(type, value),
});

const en = { id: 'en', name: 'English' };
const de = { id: 'de', name: 'German' };
const at = new Date('2026-01-01T00:00:00Z');

/** A space `s1` (en fallback, de) with one token per type and cache setting. */
export async function seedSpace(t: TestApp, spaceId = S1): Promise<void> {
  await insertSpace(t.db, { id: spaceId, name: 'Space', locales: [en, de], defaultLocale: en });
  await t.db
    .insert(tokens)
    .values([
      tokenRow(spaceId, TokenType.PREVIEW, TOKEN_READ, 'read'),
      tokenRow(spaceId, TokenType.PUBLIC, TOKEN_PUBLIC, 'public'),
      tokenRow(spaceId, TokenType.PREVIEW, TOKEN_DRAFT, 'draft', 30),
      tokenRow(spaceId, TokenType.MANAGEMENT, TOKEN_MANAGEMENT, 'management'),
      tokenRow(spaceId, TokenType.PUBLIC, TOKEN_NO_CACHE, 'no cache', 0),
    ]);
}

/**
 * Content tree in `s1`:
 *   home (DOCUMENT, published en+de)          blog (FOLDER)
 *   blog/post-1 (DOCUMENT, published en only) blog/post-2 (DOCUMENT, never published)
 *   blog-archive (FOLDER) / old (DOCUMENT)    — a sibling sharing the "blog" prefix
 */
export async function seedContent(t: TestApp, spaceId = S1): Promise<void> {
  await t.db.insert(schemas).values({
    id: newUuid(),
    spaceId,
    name: 'page',
    type: 'ROOT',
    fields: [
      { name: 'title', kind: SchemaFieldKind.TEXT, translatable: true },
      { name: 'author', kind: SchemaFieldKind.REFERENCE },
      { name: 'cta', kind: SchemaFieldKind.LINK },
    ],
  });
  const doc = (name: keyof typeof C, slug: string, parentId: string | null, data: Record<string, unknown>, extra: object = {}) => ({
    id: C[name],
    spaceId,
    kind: 'DOCUMENT' as const,
    name,
    slug,
    parentId,
    schema: 'page',
    data: { _id: `${name}-root`, _schema: 'page', ...data },
    createdAt: at,
    updatedAt: at,
    ...extra,
  });
  await t.db.insert(contents).values([
    { id: C.blog, spaceId, kind: 'FOLDER', name: 'Blog', slug: 'blog', createdAt: at, updatedAt: at },
    { id: C.archive, spaceId, kind: 'FOLDER', name: 'Archive', slug: 'blog-archive', createdAt: at, updatedAt: at },
  ]);
  await t.db.insert(contents).values([
    doc(
      'home',
      'home',
      null,
      { title: 'Home (draft)', title_i18n_de: 'Startseite (Entwurf)' },
      {
        assets: ['logo'],
        links: [C.post1, 'deleted-link'],
        references: [C.post1],
        publishedAt: at,
      },
    ),
    doc('post1', 'post-1', C.blog, { title: 'Post 1 (draft)' }, { publishedAt: at }),
    doc('post2', 'post-2', C.blog, { title: 'Post 2 (draft)', title_i18n_de: 'Beitrag 2' }),
    doc('old', 'old', C.archive, { title: 'Old' }),
  ]);
  // Published at epoch millisecond 7: their `cv`.
  const published = (name: 'home' | 'post1', locale: string, data: Record<string, unknown>, extra: object = {}) => ({
    spaceId,
    contentId: C[name],
    version: 'published' as const,
    locale,
    builtAt: new Date(7),
    data: {
      id: C[name],
      name,
      kind: 'DOCUMENT',
      locale,
      slug: name === 'home' ? 'home' : 'post-1',
      fullSlug: name === 'home' ? 'home' : 'blog/post-1',
      parentSlug: name === 'home' ? '' : 'blog',
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
      publishedAt: at.toISOString(),
      data,
      ...extra,
    } as ContentDocumentStorage,
  });
  await t.db
    .insert(contentSnapshots)
    .values([
      published(
        'home',
        'en',
        { _id: 'home-root', _schema: 'page', title: 'Home' },
        { assets: ['logo'], links: [C.post1, 'deleted-link'], references: [C.post1] },
      ),
      published(
        'home',
        'de',
        { _id: 'home-root', _schema: 'page', title: 'Startseite' },
        { assets: ['logo'], links: [C.post1], references: [C.post1] },
      ),
      published('post1', 'en', { _id: 'post1-root', _schema: 'page', title: 'Post 1' }, { assets: ['logo'] }),
    ]);
}

export async function seedTranslations(t: TestApp, spaceId = S1): Promise<void> {
  await t.db.insert(translations).values([
    { id: newUuid(), spaceId, key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } },
    { id: newUuid(), spaceId, key: 'farewell', locales: { en: 'Bye' } },
    { id: newUuid(), spaceId, key: 'new.key', locales: { en: 'New (draft only)' } },
  ]);
  // Published at epoch millisecond 3: their `cv`.
  await t.db.insert(translationSnapshots).values([
    { spaceId, version: 'published', locale: 'en', data: { farewell: 'Bye', greeting: 'Hello' }, builtAt: new Date(3) },
    { spaceId, version: 'published', locale: 'de', data: { farewell: 'Bye', greeting: 'Hallo' }, builtAt: new Date(3) },
  ]);
}

export interface SeededAsset {
  id: string;
  bytes?: Buffer;
  type: string;
  extension: string;
  metadata?: Record<string, unknown>;
  /** Row without a stored file: an upload in flight. */
  storageMissing?: boolean;
}

export async function seedAsset(t: TestApp, asset: SeededAsset, spaceId = S1): Promise<string> {
  const md5 = asset.bytes ? createHash('md5').update(asset.bytes).digest('base64') : null;
  await t.db.insert(assets).values({
    id: asset.id,
    spaceId,
    kind: 'FILE',
    name: 'photo',
    extension: asset.extension,
    type: asset.type,
    size: asset.bytes?.length ?? 0,
    md5,
    metadata: asset.metadata,
    alt: 'A photo',
  });
  if (asset.bytes && !asset.storageMissing) {
    await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${spaceId}/assets/${asset.id}/original`, asset.bytes);
  }
  return md5 ?? '';
}
