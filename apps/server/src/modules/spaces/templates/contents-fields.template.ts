import { AssetFileType, type ContentValue, SchemaFieldKind, type SchemaField, SchemaType } from '@localess/shared';
import sharp from 'sharp';
import { newUuid } from '../../../infra/database/id.js';
import type { SpaceTemplate, SpaceTemplateSchema } from './space-template.model.js';

/*
 * "Contents (all fields)": every field kind in English, German and French, with files and documents to point to.
 * Test-only (LOCALESS_TEST_TEMPLATES). Nothing is published. The rule, which e2e tests restate
 * (apps/e2e/tests/support/contents-fields.ts):
 *
 * - `fields/plain` (`fieldsplain`, nothing translatable): one value per field, the same in every locale.
 * - `fields/translated` (`fieldsi18n`): per locale L (i = 1, 2, 3 for en, de, fr) `Text (L)`, number 10·i, date
 *   `2026-0i-01`, colour red/green/blue, option red/green/blue, a link to a URL (en), Beta (de), Gamma (fr), asset
 *   red (en) / blue (de, fr); references and blocks are never translatable, block titles are.
 * - `nested` (`nestedpage` → level1 … level5): `Nested page (L)`, `Level n (L)`.
 * - `targets/alpha|beta|gamma` (`target`): `Alpha (L)`, …
 */

const LOCALES = ['en', 'de', 'fr'] as const;
type Locale = (typeof LOCALES)[number];

/** Field names, display names and kinds, in schema order. */
const KINDS: [string, string, SchemaFieldKind][] = [
  ['text', 'Text', SchemaFieldKind.TEXT],
  ['textarea', 'Textarea', SchemaFieldKind.TEXTAREA],
  ['richtext', 'Rich Text', SchemaFieldKind.RICH_TEXT],
  ['markdown', 'Markdown', SchemaFieldKind.MARKDOWN],
  ['number', 'Number', SchemaFieldKind.NUMBER],
  ['color', 'Color', SchemaFieldKind.COLOR],
  ['date', 'Date', SchemaFieldKind.DATE],
  ['datetime', 'Datetime', SchemaFieldKind.DATETIME],
  ['boolean', 'Boolean', SchemaFieldKind.BOOLEAN],
  ['option', 'Option', SchemaFieldKind.OPTION],
  ['options', 'Options', SchemaFieldKind.OPTIONS],
  ['link', 'Link', SchemaFieldKind.LINK],
  ['reference', 'Reference', SchemaFieldKind.REFERENCE],
  ['references', 'References', SchemaFieldKind.REFERENCES],
  ['asset', 'Asset', SchemaFieldKind.ASSET],
  ['assets', 'Assets', SchemaFieldKind.ASSETS],
  ['block', 'Block', SchemaFieldKind.SCHEMA],
  ['blocks', 'Blocks', SchemaFieldKind.SCHEMAS],
];
const NEVER_TRANSLATABLE = new Set([
  SchemaFieldKind.REFERENCE,
  SchemaFieldKind.REFERENCES,
  SchemaFieldKind.SCHEMA,
  SchemaFieldKind.SCHEMAS,
]);

function fieldsSchema(name: string, translatable: boolean, card: string): SpaceTemplateSchema {
  const fields = KINDS.map(([fieldName, displayName, kind]) => {
    const field: Record<string, unknown> = { name: fieldName, kind, displayName };
    if (translatable && !NEVER_TRANSLATABLE.has(kind)) field['translatable'] = true;
    if (kind === SchemaFieldKind.OPTION || kind === SchemaFieldKind.OPTIONS) field['source'] = 'colour';
    if (kind === SchemaFieldKind.SCHEMA || kind === SchemaFieldKind.SCHEMAS) field['schemas'] = [card];
    if (!translatable && fieldName === 'asset') field['fileType'] = AssetFileType.IMAGE;
    return field as unknown as SchemaField;
  });
  return { id: name, type: SchemaType.ROOT, displayName: name, previewField: 'text', fields };
}

const title = (translatable: boolean): SchemaField =>
  ({ name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', ...(translatable ? { translatable: true } : {}) }) as SchemaField;
const child = (next: string): SchemaField =>
  ({ name: 'child', kind: SchemaFieldKind.SCHEMA, displayName: 'Child', schemas: [next] }) as SchemaField;

const SCHEMAS: SpaceTemplateSchema[] = [
  {
    id: 'colour',
    type: SchemaType.ENUM,
    displayName: 'Colour',
    values: [
      { name: 'Red', value: 'red' },
      { name: 'Green', value: 'green' },
      { name: 'Blue', value: 'blue' },
    ],
  },
  { id: 'cardplain', type: SchemaType.NODE, displayName: 'Card (plain)', previewField: 'title', fields: [title(false)] },
  { id: 'card', type: SchemaType.NODE, displayName: 'Card', previewField: 'title', fields: [title(true)] },
  fieldsSchema('fieldsplain', false, 'cardplain'),
  fieldsSchema('fieldsi18n', true, 'card'),
  ...[1, 2, 3, 4, 5].map(
    (n): SpaceTemplateSchema => ({
      id: `level${n}`,
      type: SchemaType.NODE,
      displayName: `Level ${n}`,
      previewField: 'title',
      fields: n < 5 ? [title(true), child(`level${n + 1}`)] : [title(true)],
    }),
  ),
  { id: 'nestedpage', type: SchemaType.ROOT, displayName: 'Nested page', previewField: 'title', fields: [title(true), child('level1')] },
  { id: 'target', type: SchemaType.ROOT, displayName: 'Target', previewField: 'title', fields: [title(true)] },
];

type Values = Record<string, ContentValue>;

/** A translatable value: the default locale under the bare key, the others under `{field}_i18n_{locale}`. */
function localised(field: string, value: (locale: Locale, i: number) => ContentValue): Values {
  const result: Values = {};
  LOCALES.forEach((locale, index) => {
    result[locale === 'en' ? field : `${field}_i18n_${locale}`] = value(locale, index + 1);
  });
  return result;
}

const richText = (text: string): ContentValue =>
  ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }) as unknown as ContentValue;
const asset = (uri: string): ContentValue => ({ kind: 'ASSET', uri }) as ContentValue;
const reference = (uri: string): ContentValue => ({ kind: 'REFERENCE', uri }) as ContentValue;
const block = (schema: string, values: Values): ContentValue => ({ _id: newUuid(), _schema: schema, ...values }) as ContentValue;

function plainData(id: (key: string) => string): Values {
  return {
    text: 'Plain text',
    textarea: 'Plain textarea',
    richtext: richText('Plain rich text'),
    markdown: '**Plain** markdown',
    number: 7,
    color: '#336699',
    date: '2026-01-15',
    datetime: '2026-01-15T09:30',
    boolean: true,
    option: 'green',
    options: ['red', 'blue'],
    link: { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/plain' } as ContentValue,
    reference: reference(id('alpha')),
    references: [reference(id('alpha')), reference(id('beta'))] as ContentValue,
    asset: asset(id('red')),
    assets: [asset(id('red')), asset(id('readme'))] as ContentValue,
    block: block('cardplain', { title: 'Plain block' }),
    blocks: [block('cardplain', { title: 'Plain block 1' }), block('cardplain', { title: 'Plain block 2' })] as ContentValue,
  };
}

function translatedData(id: (key: string) => string): Values {
  const pick =
    <T>(values: [T, T, T]) =>
    (_: Locale, i: number) =>
      values[i - 1] as ContentValue;
  return {
    ...localised('text', l => `Text (${l})`),
    ...localised('textarea', l => `Textarea (${l})`),
    ...localised('richtext', l => richText(`Rich text (${l})`)),
    ...localised('markdown', l => `**Markdown** (${l})`),
    ...localised('number', (_, i) => 10 * i),
    ...localised('color', pick(['#ff0000', '#00ff00', '#0000ff'])),
    ...localised('date', (_, i) => `2026-0${i}-01`),
    ...localised('datetime', (_, i) => `2026-0${i}-01T12:00`),
    ...localised('boolean', pick([true, false, true])),
    ...localised('option', pick(['red', 'green', 'blue'])),
    ...localised('options', pick([['red'], ['red', 'green'], ['green', 'blue']])),
    ...localised('link', l =>
      l === 'en'
        ? ({ kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/en' } as ContentValue)
        : ({ kind: 'LINK', type: 'content', target: '_self', uri: id(l === 'de' ? 'beta' : 'gamma') } as ContentValue),
    ),
    ...localised('asset', l => asset(id(l === 'en' ? 'red' : 'blue'))),
    ...localised(
      'assets',
      l => (l === 'en' ? [asset(id('red')), asset(id('blue'))] : l === 'de' ? [asset(id('blue'))] : [asset(id('readme'))]) as ContentValue,
    ),
    reference: reference(id('alpha')),
    references: [reference(id('alpha')), reference(id('beta'))] as ContentValue,
    block: block(
      'card',
      localised('title', l => `Block (${l})`),
    ),
    blocks: [
      block(
        'card',
        localised('title', l => `Block 1 (${l})`),
      ),
      block(
        'card',
        localised('title', l => `Block 2 (${l})`),
      ),
    ] as ContentValue,
  };
}

function nestedData(): Values {
  let inner: ContentValue | undefined;
  for (let n = 5; n >= 1; n--) {
    inner = block(`level${n}`, { ...localised('title', l => `Level ${n} (${l})`), ...(inner ? { child: inner } : {}) });
  }
  return { ...localised('title', l => `Nested page (${l})`), child: inner! };
}

const image = (width: number, height: number, background: string, format: 'png' | 'jpeg') => async () => {
  const canvas = sharp({ create: { width, height, channels: 3, background } });
  return format === 'png' ? canvas.png().toBuffer() : canvas.jpeg({ quality: 90 }).toBuffer();
};

const target = (key: string, name: string) => ({
  key,
  kind: 'DOCUMENT' as const,
  name,
  slug: key,
  parent: 'targets',
  schema: 'target',
  data: () => localised('title', l => `${name} (${l})`),
});

export const CONTENTS_FIELDS_TEMPLATE: SpaceTemplate = {
  id: 'CONTENTS_FIELDS',
  test: true,
  locales: ['de', 'fr'],
  schemas: SCHEMAS,
  assets: [
    { key: 'media', kind: 'FOLDER', name: 'Media' },
    {
      key: 'red',
      kind: 'FILE',
      name: 'red',
      parent: 'media',
      file: { extension: '.png', type: 'image/png', bytes: image(64, 48, '#ff0000', 'png') },
    },
    {
      key: 'blue',
      kind: 'FILE',
      name: 'blue',
      parent: 'media',
      file: { extension: '.jpg', type: 'image/jpeg', bytes: image(32, 32, '#0000ff', 'jpeg') },
    },
    {
      key: 'readme',
      kind: 'FILE',
      name: 'readme',
      parent: 'media',
      file: { extension: '.txt', type: 'text/plain', bytes: async () => Buffer.from('Localess test file.\n', 'utf8') },
    },
  ],
  contents: [
    { key: 'targets', kind: 'FOLDER', name: 'Targets', slug: 'targets' },
    target('alpha', 'Alpha'),
    target('beta', 'Beta'),
    target('gamma', 'Gamma'),
    { key: 'fields', kind: 'FOLDER', name: 'Fields', slug: 'fields' },
    { key: 'plain', kind: 'DOCUMENT', name: 'All fields (plain)', slug: 'plain', parent: 'fields', schema: 'fieldsplain', data: plainData },
    {
      key: 'translated',
      kind: 'DOCUMENT',
      name: 'All fields (translated)',
      slug: 'translated',
      parent: 'fields',
      schema: 'fieldsi18n',
      data: translatedData,
    },
    { key: 'nested', kind: 'DOCUMENT', name: 'Nested page', slug: 'nested', schema: 'nestedpage', data: nestedData },
  ],
};
