import { createHash } from 'node:crypto';
import { assets, contentPublished, contents, schemas, spaces, tokens, translationPublished, translations } from '../src/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/storage/storage.driver.js';
import type { TestApp } from './test-app.js';

export const TOKEN_V1 = 'AAAAAAAAAAAAAAAAAAAA';
export const TOKEN_PUBLIC = 'BBBBBBBBBBBBBBBBBBBB';
export const TOKEN_DRAFT = 'CCCCCCCCCCCCCCCCCCCC';
export const TOKEN_DEV = 'DDDDDDDDDDDDDDDDDDDD';
export const TOKEN_NO_CACHE = 'EEEEEEEEEEEEEEEEEEEE';
export const TOKEN_NONE = 'FFFFFFFFFFFFFFFFFFFF';

const en = { id: 'en', name: 'English' };
const de = { id: 'de', name: 'German' };
const at = new Date('2026-01-01T00:00:00Z');

/** A space `s1` (en fallback, de) with one token per permission profile. */
export async function seedSpace(t: TestApp, spaceId = 's1'): Promise<void> {
  await t.db
    .insert(spaces)
    .values({ id: spaceId, name: 'Space', locales: [en, de], localeFallback: en, contentVersion: 7, translationVersion: 3 });
  await t.db.insert(tokens).values([
    { id: TOKEN_V1, spaceId, name: 'legacy v1' },
    { id: TOKEN_PUBLIC, spaceId, name: 'public', version: 2, permissions: ['CONTENT_PUBLIC', 'TRANSLATION_PUBLIC'] },
    { id: TOKEN_DRAFT, spaceId, name: 'draft', version: 2, permissions: ['CONTENT_DRAFT', 'TRANSLATION_DRAFT'], cacheTtl: 30 },
    { id: TOKEN_DEV, spaceId, name: 'dev', version: 2, permissions: ['DEV_TOOLS'] },
    { id: TOKEN_NO_CACHE, spaceId, name: 'no cache', version: 2, permissions: ['CONTENT_PUBLIC'], cacheTtl: 0 },
    { id: TOKEN_NONE, spaceId, name: 'none', version: 2, permissions: [] },
  ]);
}

/**
 * Content tree in `s1`:
 *   home (DOCUMENT, published en+de)          blog (FOLDER)
 *   blog/post-1 (DOCUMENT, published en only) blog/post-2 (DOCUMENT, never published)
 *   blog-archive (FOLDER) / old (DOCUMENT)    — a sibling sharing the "blog" prefix
 */
export async function seedContent(t: TestApp, spaceId = 's1'): Promise<void> {
  await t.db.insert(schemas).values({
    spaceId,
    id: 'page',
    type: 'ROOT',
    fields: [
      { name: 'title', kind: 'TEXT', translatable: true },
      { name: 'author', kind: 'REFERENCE' },
      { name: 'cta', kind: 'LINK' },
    ],
  });
  const doc = (id: string, slug: string, parentSlug: string, data: Record<string, unknown>, extra: object = {}) => ({
    id,
    spaceId,
    kind: 'DOCUMENT',
    name: id,
    slug,
    parentSlug,
    fullSlug: parentSlug ? `${parentSlug}/${slug}` : slug,
    schema: 'page',
    data: { _id: `${id}-root`, _schema: 'page', ...data },
    createdAt: at,
    updatedAt: at,
    ...extra,
  });
  await t.db.insert(contents).values([
    doc(
      'home',
      'home',
      '',
      { title: 'Home (draft)', title_i18n_de: 'Startseite (Entwurf)' },
      {
        assets: ['logo'],
        links: ['post1', 'deleted-link'],
        references: ['post1'],
        publishedAt: at,
      },
    ),
    { id: 'blog', spaceId, kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog', createdAt: at, updatedAt: at },
    doc('post1', 'post-1', 'blog', { title: 'Post 1 (draft)' }, { publishedAt: at }),
    doc('post2', 'post-2', 'blog', { title: 'Post 2 (draft)', title_i18n_de: 'Beitrag 2' }),
    {
      id: 'archive',
      spaceId,
      kind: 'FOLDER',
      name: 'Archive',
      slug: 'blog-archive',
      parentSlug: '',
      fullSlug: 'blog-archive',
      createdAt: at,
      updatedAt: at,
    },
    doc('old', 'old', 'blog-archive', { title: 'Old' }),
  ]);
  const published = (id: string, locale: string, data: Record<string, unknown>, extra: object = {}) => ({
    spaceId,
    contentId: id,
    locale,
    data: {
      id,
      name: id,
      kind: 'DOCUMENT',
      locale,
      slug: id === 'home' ? 'home' : 'post-1',
      fullSlug: id === 'home' ? 'home' : 'blog/post-1',
      parentSlug: id === 'home' ? '' : 'blog',
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
      publishedAt: at.toISOString(),
      data,
      ...extra,
    },
  });
  await t.db
    .insert(contentPublished)
    .values([
      published(
        'home',
        'en',
        { _id: 'home-root', _schema: 'page', title: 'Home' },
        { assets: ['logo'], links: ['post1', 'deleted-link'], references: ['post1'] },
      ),
      published(
        'home',
        'de',
        { _id: 'home-root', _schema: 'page', title: 'Startseite' },
        { assets: ['logo'], links: ['post1'], references: ['post1'] },
      ),
      published('post1', 'en', { _id: 'post1-root', _schema: 'page', title: 'Post 1' }, { assets: ['logo'] }),
    ]);
}

export async function seedTranslations(t: TestApp, spaceId = 's1'): Promise<void> {
  await t.db.insert(translations).values([
    { spaceId, id: 'greeting', type: 'STRING', locales: { en: 'Hello', de: 'Hallo' } },
    { spaceId, id: 'farewell', type: 'STRING', locales: { en: 'Bye' } },
    { spaceId, id: 'new.key', type: 'STRING', locales: { en: 'New (draft only)' } },
  ]);
  await t.db.insert(translationPublished).values([
    { spaceId, locale: 'en', data: { farewell: 'Bye', greeting: 'Hello' } },
    { spaceId, locale: 'de', data: { farewell: 'Bye', greeting: 'Hallo' } },
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

export async function seedAsset(t: TestApp, asset: SeededAsset, spaceId = 's1'): Promise<string> {
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
