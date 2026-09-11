import { SpaceTemplate, SpaceTemplateId } from '@shared/models/space-template.model';

import { BLOG_TEMPLATE } from './blog.template';
import { ECOMMERCE_TEMPLATE } from './ecommerce.template';
import { EMPTY_TEMPLATE } from './empty.template';

export const EMPTY_TEMPLATE_ID: SpaceTemplateId = 'EMPTY';

/** Order is the order the choice cards render in. EMPTY is first because it is the default. */
export const SPACE_TEMPLATES: SpaceTemplate[] = [EMPTY_TEMPLATE, BLOG_TEMPLATE, ECOMMERCE_TEMPLATE];

export { BLOG_TEMPLATE, ECOMMERCE_TEMPLATE, EMPTY_TEMPLATE };
