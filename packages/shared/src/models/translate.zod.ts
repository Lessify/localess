import { z } from 'zod';

import type { TranslateData } from './translate.model.js';

const zFormat = z.enum(['text', 'html']).optional();

/**
 * `POST /api/app/translate`: one string, or a batch of items (strict: an unknown field, or both `content` and `items`, is a 400). Checked against `TranslateData`, which stays written by
 * hand: its `?: never` members refuse a body with both `content` and `items`, which the inferred union would not.
 */
export const zTranslateData = z.union([
  z.strictObject({ sourceLocale: z.string().min(1), targetLocale: z.string().min(1), content: z.string(), format: zFormat }),
  z.strictObject({
    sourceLocale: z.string().min(1),
    targetLocale: z.string().min(1),
    items: z.array(z.strictObject({ id: z.string(), content: z.string(), format: zFormat })).max(5000),
  }),
]) satisfies z.ZodType<TranslateData>;
