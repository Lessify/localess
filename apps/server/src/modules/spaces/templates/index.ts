import { BLOG_TEMPLATE } from './blog.template.js';
import { ECOMMERCE_TEMPLATE } from './ecommerce.template.js';
import { EMPTY_TEMPLATE } from './empty.template.js';
import { MARKETING_TEMPLATE } from './marketing.template.js';
import type { SpaceTemplate } from './space-template.model.js';
import { TRANSLATIONS_LARGE_TEMPLATE } from './translations-large.template.js';

export const EMPTY_TEMPLATE_ID = 'EMPTY';

/** The order the dialog lists them in: EMPTY first (the default), the test-only ones last. */
export const SPACE_TEMPLATES: readonly SpaceTemplate[] = [
  EMPTY_TEMPLATE,
  BLOG_TEMPLATE,
  ECOMMERCE_TEMPLATE,
  MARKETING_TEMPLATE,
  TRANSLATIONS_LARGE_TEMPLATE,
];

export { BLOG_TEMPLATE, ECOMMERCE_TEMPLATE, EMPTY_TEMPLATE, MARKETING_TEMPLATE, TRANSLATIONS_LARGE_TEMPLATE };
export type { SpaceTemplate, TemplateTranslation } from './space-template.model.js';
