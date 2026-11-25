import { SpaceTemplateId } from '@localess/shared';

/** How the Create Space dialog shows a template; the server holds what it creates. */
export interface SpaceTemplateView {
  name: string;
  description: string;
  /** An @ng-icons lucide name, registered by the dialog. */
  icon: string;
}

/** The first choice, sending no template: the space alone. */
export const NO_TEMPLATE_VIEW: SpaceTemplateView = {
  name: 'Empty',
  description: 'A blank space. Add your own schemas.',
  icon: 'lucideFile',
};

/** One per id of `SPACE_TEMPLATE_IDS`: a new id does not compile until it is here. */
export const SPACE_TEMPLATE_VIEWS: Record<SpaceTemplateId, SpaceTemplateView> = {
  blog: { name: 'Blog', description: 'Posts with authors, categories and tags.', icon: 'lucideNewspaper' },
  ecommerce: { name: 'E-Commerce', description: 'Products with variants, and categories.', icon: 'lucideShoppingCart' },
  marketing: { name: 'Marketing Site', description: 'Landing pages assembled from reusable blocks.', icon: 'lucideLayoutTemplate' },
  translations_large: {
    name: 'Translations (large)',
    description: '10,000 translated keys in English, German and French. For testing.',
    icon: 'lucideLanguages',
  },
  contents_fields: {
    name: 'Contents (all fields)',
    description: 'Every field kind in English, German and French, with files and documents to point to. For testing.',
    icon: 'lucideFileStack',
  },
  assets_large: {
    name: 'Assets (large)',
    description: '1,000 files in one folder, with folders to navigate and a document to pick them into. For testing.',
    icon: 'lucideImages',
  },
  contents_large: {
    name: 'Contents (large)',
    description: '2,000 documents in a deep folder tree. For testing.',
    icon: 'lucideFolderTree',
  },
};
