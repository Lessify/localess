import { ASSETS_LARGE_TEMPLATE } from './assets-large.template.js';
import { BLOG_TEMPLATE } from './blog.template.js';
import { CONTENTS_FIELDS_TEMPLATE } from './contents-fields.template.js';
import { CONTENTS_LARGE_TEMPLATE } from './contents-large.template.js';
import { ECOMMERCE_TEMPLATE } from './ecommerce.template.js';
import { MARKETING_TEMPLATE } from './marketing.template.js';
import type { SpaceTemplate } from './space-template.model.js';
import { TRANSLATIONS_LARGE_TEMPLATE } from './translations-large.template.js';

/** In the order of SPACE_TEMPLATE_IDS (the dialog's): the test-only ones last. No template: the space alone. */
export const SPACE_TEMPLATES: readonly SpaceTemplate[] = [
  BLOG_TEMPLATE,
  ECOMMERCE_TEMPLATE,
  MARKETING_TEMPLATE,
  TRANSLATIONS_LARGE_TEMPLATE,
  CONTENTS_FIELDS_TEMPLATE,
  ASSETS_LARGE_TEMPLATE,
  CONTENTS_LARGE_TEMPLATE,
];

export {
  ASSETS_LARGE_TEMPLATE,
  BLOG_TEMPLATE,
  CONTENTS_FIELDS_TEMPLATE,
  CONTENTS_LARGE_TEMPLATE,
  ECOMMERCE_TEMPLATE,
  MARKETING_TEMPLATE,
  TRANSLATIONS_LARGE_TEMPLATE,
};
export type { SpaceTemplate, TemplateAsset, TemplateContent, TemplateTranslation } from './space-template.model.js';
