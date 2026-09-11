import { AssetFileType, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { SpaceTemplate } from '@shared/models/space-template.model';

/**
 * `variant` is a NODE because variants are embedded in a product rather than addressable on their
 * own - which is exactly what the SCHEMAS field kind is for.
 */
export const ECOMMERCE_TEMPLATE: SpaceTemplate = {
  id: 'ECOMMERCE',
  name: 'E-Commerce',
  description: 'Products with variants, and categories.',
  icon: 'lucideShoppingCart',
  schemas: [
    {
      id: 'size',
      type: SchemaType.ENUM,
      displayName: 'Size',
      description: 'Available sizes.',
      values: [
        { name: 'XS', value: 'xs' },
        { name: 'S', value: 's' },
        { name: 'M', value: 'm' },
        { name: 'L', value: 'l' },
        { name: 'XL', value: 'xl' },
      ],
    },
    {
      id: 'variant',
      type: SchemaType.NODE,
      displayName: 'Variant',
      description: 'One buyable version of a product.',
      previewField: 'sku',
      fields: [
        { name: 'sku', kind: SchemaFieldKind.TEXT, displayName: 'SKU', required: true },
        { name: 'size', kind: SchemaFieldKind.OPTION, displayName: 'Size', source: 'size' },
        { name: 'color', kind: SchemaFieldKind.COLOR, displayName: 'Color' },
        { name: 'price', kind: SchemaFieldKind.NUMBER, displayName: 'Price', minValue: 0 },
        { name: 'stock', kind: SchemaFieldKind.NUMBER, displayName: 'Stock', minValue: 0 },
      ],
    },
    {
      id: 'category',
      type: SchemaType.ROOT,
      displayName: 'Category',
      description: 'Groups products.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true, translatable: true },
        { name: 'description', kind: SchemaFieldKind.TEXTAREA, displayName: 'Description', translatable: true },
      ],
    },
    {
      id: 'product',
      type: SchemaType.ROOT,
      displayName: 'Product',
      description: 'Something for sale.',
      previewField: 'name',
      fields: [
        { name: 'name', kind: SchemaFieldKind.TEXT, displayName: 'Name', required: true, translatable: true },
        { name: 'description', kind: SchemaFieldKind.RICH_TEXT, displayName: 'Description', translatable: true },
        { name: 'images', kind: SchemaFieldKind.ASSETS, displayName: 'Images', fileTypes: [AssetFileType.IMAGE] },
        { name: 'categories', kind: SchemaFieldKind.REFERENCES, displayName: 'Categories', path: '/categories' },
        { name: 'variants', kind: SchemaFieldKind.SCHEMAS, displayName: 'Variants', schemas: ['variant'] },
      ],
    },
  ],
};
