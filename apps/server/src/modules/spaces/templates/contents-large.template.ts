import { type SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';

import type { SpaceTemplate, TemplateContent } from './space-template.model.js';

/*
 * "Contents (large)": 2,000 documents and 67 folders, to test the Contents page, folder publishing, `/links`, the
 * references picker and the Link field at size. Test-only (LOCALESS_TEST_TEMPLATES), English only, nothing published.
 * The rule, which e2e tests restate (apps/e2e/tests/support/contents-large.ts); keys are full slugs:
 *
 * - `archive` → `doc-0001` … `doc-1000` (Doc 0001 …), flat;
 * - `blog` → `2022` … `2026` → `01` … `12` → `post-01` … `post-16` (Post 2024-06-03 …);
 * - `page-01` … `page-40` (Page 01 …) at the root.
 *
 * Every document: `title` its name, `body` `Body of <name>`, `related` the previous document of its folder (none for
 * the first), `link` `https://example.com/<full slug>`.
 */

const pad = (n: number, width: number) => String(n).padStart(width, '0');

const field = (name: string, displayName: string, kind: SchemaFieldKind): SchemaField => ({ name, displayName, kind }) as SchemaField;

const folder = (key: string, name: string, slug: string, parent?: string): TemplateContent => ({
  key,
  kind: 'FOLDER',
  name,
  slug,
  ...(parent ? { parent } : {}),
});

/** The documents of one folder (or of the root), each referring to the one before it. */
function documents(parent: string | undefined, items: { slug: string; name: string }[]): TemplateContent[] {
  const keyOf = (slug: string) => (parent ? `${parent}/${slug}` : slug);
  return items.map(({ slug, name }, index) => {
    const key = keyOf(slug);
    const previous = index > 0 ? keyOf(items[index - 1].slug) : undefined;
    return {
      key,
      kind: 'DOCUMENT',
      name,
      slug,
      ...(parent ? { parent } : {}),
      schema: 'article',
      data: id => ({
        title: name,
        body: `Body of ${name}`,
        ...(previous ? { related: { kind: 'REFERENCE', uri: id(previous) } } : {}),
        link: { kind: 'LINK', type: 'url', target: '_blank', uri: `https://example.com/${key}` },
      }),
    };
  });
}

function tree(): TemplateContent[] {
  const result: TemplateContent[] = [folder('archive', 'Archive', 'archive')];
  result.push(
    ...documents(
      'archive',
      Array.from({ length: 1_000 }, (_, i) => ({ slug: `doc-${pad(i + 1, 4)}`, name: `Doc ${pad(i + 1, 4)}` })),
    ),
  );
  result.push(folder('blog', 'Blog', 'blog'));
  for (let year = 2022; year <= 2026; year++) {
    const yearKey = `blog/${year}`;
    result.push(folder(yearKey, String(year), String(year), 'blog'));
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${yearKey}/${pad(month, 2)}`;
      result.push(folder(monthKey, pad(month, 2), pad(month, 2), yearKey));
      result.push(
        ...documents(
          monthKey,
          Array.from({ length: 16 }, (_, i) => ({ slug: `post-${pad(i + 1, 2)}`, name: `Post ${year}-${pad(month, 2)}-${pad(i + 1, 2)}` })),
        ),
      );
    }
  }
  result.push(
    ...documents(
      undefined,
      Array.from({ length: 40 }, (_, i) => ({ slug: `page-${pad(i + 1, 2)}`, name: `Page ${pad(i + 1, 2)}` })),
    ),
  );
  return result;
}

export const CONTENTS_LARGE_TEMPLATE: SpaceTemplate = {
  id: 'contents_large',
  test: true,
  schemas: [
    {
      id: 'article',
      type: SchemaType.ROOT,
      displayName: 'Article',
      previewField: 'title',
      fields: [
        field('title', 'Title', SchemaFieldKind.TEXT),
        field('body', 'Body', SchemaFieldKind.TEXTAREA),
        field('related', 'Related', SchemaFieldKind.REFERENCE),
        field('link', 'Link', SchemaFieldKind.LINK),
      ],
    },
  ],
  contents: tree(),
};
