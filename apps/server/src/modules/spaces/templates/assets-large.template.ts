import { AssetFileType, SchemaFieldKind, type SchemaField, SchemaType } from '@localess/shared';
import sharp from 'sharp';
import type { SpaceTemplate, TemplateAsset } from './space-template.model.js';

/*
 * "Assets (large)": 1,000 files in one folder, to test paging, sorting and the picker at size. Test-only
 * (LOCALESS_TEST_TEMPLATES). The rule, which e2e tests restate (apps/e2e/tests/support/assets-large.ts):
 *
 * - `Bulk`: `file-0001` … `file-1000`. Every 10th is a 16×16 PNG (one image, the same bytes); the others are text files
 *   of exactly N bytes, so `file-0001` is the smallest file and `file-0999` the largest.
 * - `Nested` → `Deep`, an image in each (`nested-image`, `deep-image`); `Empty` holds nothing.
 * - `gallery` schema (images only / any file) and an empty `Gallery` document, for the picker.
 */

const FILES = 1_000;
const PATTERN = 'Localess test file. ';
const IMAGE_METADATA = { type: 'image', format: 'png', width: 16, height: 16 };

let png: Promise<Buffer> | undefined;
/** One small PNG, generated once and shared by every image of the template. */
const image = () =>
  (png ??= sharp({ create: { width: 16, height: 16, channels: 3, background: '#3366cc' } })
    .png()
    .toBuffer());

/** Exactly `size` bytes of text. */
const text = (size: number) => async () => Buffer.from(PATTERN.repeat(Math.ceil(size / PATTERN.length)).slice(0, size), 'utf8');

const imageFile = { extension: '.png', type: 'image/png', bytes: image, metadata: IMAGE_METADATA };

function bulkFile(n: number): TemplateAsset {
  const name = `file-${String(n).padStart(4, '0')}`;
  const file = n % 10 === 0 ? imageFile : { extension: '.txt', type: 'text/plain', bytes: text(n) };
  return { key: name, kind: 'FILE', name, parent: 'bulk', file };
}

const assets: TemplateAsset[] = [
  { key: 'bulk', kind: 'FOLDER', name: 'Bulk' },
  { key: 'nested', kind: 'FOLDER', name: 'Nested' },
  { key: 'deep', kind: 'FOLDER', name: 'Deep', parent: 'nested' },
  { key: 'empty', kind: 'FOLDER', name: 'Empty' },
  { key: 'nested-image', kind: 'FILE', name: 'nested-image', parent: 'nested', file: imageFile },
  { key: 'deep-image', kind: 'FILE', name: 'deep-image', parent: 'deep', file: imageFile },
  ...Array.from({ length: FILES }, (_, i) => bulkFile(i + 1)),
];

const field = (name: string, displayName: string, imagesOnly: boolean): SchemaField =>
  ({ name, kind: SchemaFieldKind.ASSETS, displayName, ...(imagesOnly ? { fileType: AssetFileType.IMAGE } : {}) }) as SchemaField;

export const ASSETS_LARGE_TEMPLATE: SpaceTemplate = {
  id: 'ASSETS_LARGE',
  test: true,
  schemas: [
    {
      id: 'gallery',
      type: SchemaType.ROOT,
      displayName: 'Gallery',
      fields: [field('images', 'Images', true), field('files', 'Files', false)],
    },
  ],
  assets,
  contents: [{ key: 'gallery', kind: 'DOCUMENT', name: 'Gallery', slug: 'gallery', schema: 'gallery' }],
};
