import { AssetFileType, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { SpaceTemplate } from '@shared/models/space-template.model';

/**
 * `author` and `category` are ROOT rather than NODE because REFERENCE fields point at content
 * documents - so the things being referenced have to be documents in their own right.
 */
export const BLOG_TEMPLATE: SpaceTemplate = {
  id: 'BLOG',
  name: 'Blog',
  description: 'Posts with authors, categories and tags.',
  icon: 'lucideNewspaper',
  schemas: [
    {
      id: 'author',
      type: SchemaType.ROOT,
      displayName: 'Author',
      description: 'A person who writes posts.',
      previewField: 'fullName',
      fields: [
        { name: 'fullName', kind: SchemaFieldKind.TEXT, displayName: 'Full Name', required: true },
        { name: 'bio', kind: SchemaFieldKind.TEXTAREA, displayName: 'Bio', translatable: true },
        { name: 'avatar', kind: SchemaFieldKind.ASSET, displayName: 'Avatar', fileTypes: [AssetFileType.IMAGE] },
      ],
    },
    {
      id: 'category',
      type: SchemaType.ROOT,
      displayName: 'Category',
      description: 'Groups posts by subject.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true, translatable: true },
        { name: 'description', kind: SchemaFieldKind.TEXTAREA, displayName: 'Description', translatable: true },
      ],
    },
    {
      id: 'blogtag',
      type: SchemaType.ENUM,
      displayName: 'Blog Tag',
      description: 'Tags a post can carry.',
      values: [
        { name: 'Engineering', value: 'engineering' },
        { name: 'Design', value: 'design' },
        { name: 'Product', value: 'product' },
      ],
    },
    {
      id: 'blogpost',
      type: SchemaType.ROOT,
      displayName: 'Blog Post',
      description: 'A single article.',
      previewField: 'title',
      fields: [
        { name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true, translatable: true },
        { name: 'excerpt', kind: SchemaFieldKind.TEXTAREA, displayName: 'Excerpt', translatable: true },
        { name: 'body', kind: SchemaFieldKind.RICH_TEXT, displayName: 'Body', translatable: true },
        { name: 'publishedOn', kind: SchemaFieldKind.DATE, displayName: 'Published On' },
        { name: 'authors', kind: SchemaFieldKind.REFERENCES, displayName: 'Authors', path: '/authors' },
        { name: 'categories', kind: SchemaFieldKind.REFERENCES, displayName: 'Categories', path: '/categories' },
        { name: 'tags', kind: SchemaFieldKind.OPTIONS, displayName: 'Tags', source: 'blogtag' },
      ],
    },
  ],
};
