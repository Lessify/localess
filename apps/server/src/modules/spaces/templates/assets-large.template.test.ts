import { isFieldTranslatable, type SchemaField } from '@localess/shared';
import { zSchemaExportArraySchema } from '@localess/shared/zod';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { ASSETS_LARGE_TEMPLATE } from './assets-large.template.js';

const template = ASSETS_LARGE_TEMPLATE;
const bulk = template.assets!.filter(it => it.parent === 'bulk');
const byName = (name: string) => bulk.find(it => it.name === name)!;

describe('ASSETS_LARGE_TEMPLATE', () => {
  it('is a test template in English only', () => {
    expect(template).toMatchObject({ id: 'assets_large', test: true });
    expect(template.locales ?? []).toEqual([]);
  });

  it('has the folders: Bulk, Nested/Deep with an image each, Empty', () => {
    const folders = template.assets!.filter(it => it.kind === 'FOLDER').map(it => [it.name, it.parent ?? null]);
    expect(folders).toEqual([
      ['Bulk', null],
      ['Nested', null],
      ['Deep', 'nested'],
      ['Empty', null],
    ]);
    expect(template.assets!.filter(it => it.parent === 'nested' && it.kind === 'FILE').map(it => it.name)).toEqual(['nested-image']);
    expect(template.assets!.filter(it => it.parent === 'deep').map(it => it.name)).toEqual(['deep-image']);
    expect(template.assets!.filter(it => it.parent === 'empty')).toEqual([]);
  });

  it('puts 1,000 files in Bulk, named in number order', () => {
    expect(bulk).toHaveLength(1_000);
    expect(bulk.map(it => it.name)).toEqual([...bulk.map(it => it.name)].sort());
    expect(bulk[0].name).toBe('file-0001');
    expect(bulk[999].name).toBe('file-1000');
  });

  it('makes every 10th file a 16x16 PNG with its metadata declared', async () => {
    const images = bulk.filter(it => it.file!.type === 'image/png');
    expect(images.map(it => it.name)).toEqual(Array.from({ length: 100 }, (_, i) => `file-${String((i + 1) * 10).padStart(4, '0')}`));
    for (const image of images) {
      expect(image.file).toMatchObject({ extension: '.png', metadata: { type: 'image', format: 'png', width: 16, height: 16 } });
    }
    expect(await sharp(await images[0].file!.bytes()).metadata()).toMatchObject({ width: 16, height: 16, format: 'png' });
  });

  it('gives text file N exactly N bytes: file-0001 is the smallest, file-0999 the largest', async () => {
    for (const n of [1, 2, 11, 999]) {
      const file = byName(`file-${String(n).padStart(4, '0')}`).file!;
      expect(file).toMatchObject({ extension: '.txt', type: 'text/plain' });
      expect(file.metadata).toBeUndefined();
      expect((await file.bytes()).length).toBe(n);
    }
    const sizes = await Promise.all(bulk.map(async it => [it.name, (await it.file!.bytes()).length] as const));
    const textSizes = sizes.filter(([name]) => byName(name).file!.type === 'text/plain').map(([, size]) => size);
    expect(new Set(textSizes).size).toBe(900);
    const sorted = [...sizes].sort((a, b) => a[1] - b[1]);
    expect(sorted[0][0]).toBe('file-0001');
    expect(sorted.at(-1)![0]).toBe('file-0999');
  });

  it('has a gallery schema and document for the picker', () => {
    expect(zSchemaExportArraySchema.safeParse(template.schemas).success).toBe(true);
    const gallery = template.schemas.find(it => it.id === 'gallery') as { fields: SchemaField[] };
    expect(gallery.fields.map(it => [it.name, it.displayName, it.kind])).toEqual([
      ['images', 'Images', 'ASSETS'],
      ['files', 'Files', 'ASSETS'],
    ]);
    expect(gallery.fields[0]).toMatchObject({ fileType: 'IMAGE' });
    expect(gallery.fields.some(isFieldTranslatable)).toBe(false);
    expect(template.contents).toEqual([{ key: 'gallery', kind: 'DOCUMENT', name: 'Gallery', slug: 'gallery', schema: 'gallery' }]);
  });

  it('is stable', async () => {
    const first = await Promise.all(bulk.slice(0, 20).map(it => it.file!.bytes()));
    const again = await Promise.all(bulk.slice(0, 20).map(it => it.file!.bytes()));
    first.forEach((bytes, i) => expect(bytes.equals(again[i])).toBe(true));
  });
});
