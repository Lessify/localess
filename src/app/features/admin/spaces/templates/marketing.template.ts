import { AssetFileType, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { SpaceTemplate } from '@shared/models/space-template.model';

/**
 * A composed page rather than a list of records, which is what the other templates already show.
 *
 * The idea worth copying here is `page.sections`: one SCHEMAS field accepting SEVERAL node types,
 * so an editor assembles a page from interchangeable blocks instead of filling a fixed form. That
 * is the pattern people most often model badly when left to invent it.
 *
 * Everything an editor writes is `translatable` - marketing copy is exactly the content Localess
 * exists to translate.
 */
export const MARKETING_TEMPLATE: SpaceTemplate = {
  id: 'MARKETING',
  name: 'Marketing Site',
  description: 'Landing pages assembled from reusable blocks.',
  icon: 'lucideLayoutTemplate',
  schemas: [
    {
      id: 'cta',
      type: SchemaType.NODE,
      displayName: 'Call to Action',
      description: 'A labelled link. Nested inside blocks rather than used on its own.',
      previewField: 'label',
      fields: [
        { name: 'label', kind: SchemaFieldKind.TEXT, displayName: 'Label', required: true, translatable: true },
        { name: 'link', kind: SchemaFieldKind.LINK, displayName: 'Link' },
      ],
    },
    {
      id: 'hero',
      type: SchemaType.NODE,
      displayName: 'Hero',
      description: 'The opening block of a page.',
      previewField: 'headline',
      fields: [
        { name: 'headline', kind: SchemaFieldKind.TEXT, displayName: 'Headline', required: true, translatable: true },
        { name: 'subhead', kind: SchemaFieldKind.TEXTAREA, displayName: 'Subhead', translatable: true },
        { name: 'background', kind: SchemaFieldKind.ASSET, displayName: 'Background', fileTypes: [AssetFileType.IMAGE] },
        // A single nested node, where `sections` below takes many - the two halves of SCHEMA/SCHEMAS.
        { name: 'action', kind: SchemaFieldKind.SCHEMA, displayName: 'Action', schemas: ['cta'] },
      ],
    },
    {
      id: 'feature',
      type: SchemaType.NODE,
      displayName: 'Feature',
      description: 'One item within a feature grid.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true, translatable: true },
        { name: 'body', kind: SchemaFieldKind.TEXTAREA, displayName: 'Body', translatable: true },
        { name: 'icon', kind: SchemaFieldKind.ASSET, displayName: 'Icon', fileTypes: [AssetFileType.IMAGE] },
      ],
    },
    {
      id: 'featuregrid',
      type: SchemaType.NODE,
      displayName: 'Feature Grid',
      description: 'A titled group of features.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', translatable: true },
        { name: 'features', kind: SchemaFieldKind.SCHEMAS, displayName: 'Features', schemas: ['feature'] },
      ],
    },
    {
      id: 'testimonial',
      type: SchemaType.NODE,
      displayName: 'Testimonial',
      description: 'A quote from a customer.',
      previewField: 'author',
      fields: [
        { name: 'quote', kind: SchemaFieldKind.TEXTAREA, displayName: 'Quote', required: true, translatable: true },
        { name: 'author', kind: SchemaFieldKind.TEXT, displayName: 'Author', required: true },
        { name: 'avatar', kind: SchemaFieldKind.ASSET, displayName: 'Avatar', fileTypes: [AssetFileType.IMAGE] },
      ],
    },
    {
      id: 'page',
      type: SchemaType.ROOT,
      displayName: 'Page',
      description: 'A landing page, assembled from blocks.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true, translatable: true },
        { name: 'seoDescription', kind: SchemaFieldKind.TEXTAREA, displayName: 'SEO Description', translatable: true },
        { name: 'published', kind: SchemaFieldKind.BOOLEAN, displayName: 'Published' },
        // Several node types in one field: this is what makes it a page builder rather than a form.
        {
          name: 'sections',
          kind: SchemaFieldKind.SCHEMAS,
          displayName: 'Sections',
          schemas: ['hero', 'featuregrid', 'testimonial'],
        },
      ],
    },
  ],
};
