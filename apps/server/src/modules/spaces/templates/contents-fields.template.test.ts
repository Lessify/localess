import { type ContentData, isFieldTranslatable, SchemaFieldKind, type SchemaField } from '@localess/shared';
import { zContentData } from '@localess/shared/zod';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { contentRefs } from './content-refs.js';
import { CONTENTS_FIELDS_TEMPLATE } from './contents-fields.template.js';

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
const NEVER_TRANSLATABLE = ['reference', 'references', 'block', 'blocks'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const template = CONTENTS_FIELDS_TEMPLATE;
const fieldsOf = (name: string): SchemaField[] => {
  const schema = template.schemas.find(it => it.id === name);
  return schema && 'fields' in schema ? (schema.fields ?? []) : [];
};
const id = (key: string) => `id-${key}`;
const document = (key: string): ContentData => {
  const content = template.contents!.find(it => it.key === key)!;
  return { _id: id(key), _schema: content.schema!, ...content.data!(id) } as ContentData;
};
/** Every block `_id` in a value, depth first. */
const blockIds = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(blockIds);
  if (value && typeof value === 'object') {
    const own = '_schema' in value && '_id' in value ? [(value as { _id: string })._id] : [];
    return [
      ...own,
      ...Object.entries(value)
        .filter(([k]) => k !== '_id')
        .flatMap(([, v]) => blockIds(v)),
    ];
  }
  return [];
};
const withoutBlockIds = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (k, v) => (k === '_id' && typeof v === 'string' && UUID.test(v) ? 'block' : v)));

describe('CONTENTS_FIELDS_TEMPLATE', () => {
  it('is a test template with German and French', () => {
    expect(template).toMatchObject({
      id: 'CONTENTS_FIELDS',
      name: 'Contents (all fields)',
      icon: 'lucideFileStack',
      test: true,
      locales: ['de', 'fr'],
    });
  });

  it('has the 18 field kinds in both field schemas, translatable only where asked', () => {
    for (const name of ['fieldsplain', 'fieldsi18n']) {
      expect(fieldsOf(name).map(it => [it.name, it.displayName, it.kind])).toEqual(KINDS);
    }
    for (const field of fieldsOf('fieldsplain')) expect(isFieldTranslatable(field), field.name).toBe(false);
    for (const field of fieldsOf('fieldsi18n')) {
      expect(isFieldTranslatable(field), field.name).toBe(!NEVER_TRANSLATABLE.includes(field.name));
    }
    expect(fieldsOf('fieldsplain').find(it => it.name === 'asset')).toMatchObject({ fileType: 'IMAGE' });
    expect(fieldsOf('fieldsplain').find(it => it.name === 'blocks')).toMatchObject({ schemas: ['cardplain'] });
    expect(fieldsOf('fieldsi18n').find(it => it.name === 'blocks')).toMatchObject({ schemas: ['card'] });
    expect(isFieldTranslatable(fieldsOf('cardplain')[0])).toBe(false);
    expect(isFieldTranslatable(fieldsOf('card')[0])).toBe(true);
  });

  it('nests five levels: nestedpage → level1 … level5', () => {
    expect(fieldsOf('nestedpage').find(it => it.name === 'child')).toMatchObject({ kind: 'SCHEMA', schemas: ['level1'] });
    for (let n = 1; n <= 4; n++) {
      expect(fieldsOf(`level${n}`).find(it => it.name === 'child')).toMatchObject({ kind: 'SCHEMA', schemas: [`level${n + 1}`] });
    }
    expect(fieldsOf('level5').map(it => it.name)).toEqual(['title']);
  });

  it('writes documents the content validator accepts, with the values of the rule', () => {
    for (const content of template.contents!.filter(it => it.kind === 'DOCUMENT')) {
      expect(zContentData.safeParse(document(content.key)).success, content.key).toBe(true);
    }
    const plain = document('plain');
    expect(plain).toMatchObject({ text: 'Plain text', number: 7, option: 'green', reference: { kind: 'REFERENCE', uri: 'id-alpha' } });
    expect(Object.keys(plain).filter(it => it.includes('_i18n_'))).toEqual([]);
    const translated = document('translated');
    expect(translated).toMatchObject({
      text: 'Text (en)',
      text_i18n_de: 'Text (de)',
      number_i18n_fr: 30,
      link_i18n_de: { kind: 'LINK', type: 'content', target: '_self', uri: 'id-beta' },
    });
    expect(translated).not.toHaveProperty('reference_i18n_de');
    const nested = document('nested') as unknown as Record<string, never>;
    expect(nested['child']['child']['child']['child']['child']['title_i18n_de']).toBe('Level 5 (de)');
    const ids = template.contents!.filter(it => it.data).flatMap(it => blockIds(document(it.key)).filter(b => !b.startsWith('id-')));
    for (const block of ids) expect(block).toMatch(UUID);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists the ids the translated document points to', () => {
    expect(contentRefs(document('translated'))).toEqual({
      assets: ['id-blue', 'id-readme', 'id-red'],
      references: ['id-alpha', 'id-beta'],
      links: ['id-beta', 'id-gamma'],
    });
  });

  it('generates the same three files every time', async () => {
    const file = (key: string) => template.assets!.find(it => it.key === key)!.file!;
    expect(await sharp(await file('red').bytes()).metadata()).toMatchObject({ width: 64, height: 48, format: 'png' });
    expect(await sharp(await file('blue').bytes()).metadata()).toMatchObject({ width: 32, height: 32, format: 'jpeg' });
    expect((await file('readme').bytes()).toString('utf8')).toBe('Localess test file.\n');
    for (const key of ['red', 'blue', 'readme']) expect((await file(key).bytes()).equals(await file(key).bytes())).toBe(true);
    // Stored as an upload stores it (split-filename.ts): the extension with its dot.
    expect(['red', 'blue', 'readme'].map(key => file(key).extension)).toEqual(['.png', '.jpg', '.txt']);
  });

  it('is stable', () => {
    for (const content of template.contents!.filter(it => it.data)) {
      expect(withoutBlockIds(document(content.key))).toEqual(withoutBlockIds(document(content.key)));
    }
  });
});
