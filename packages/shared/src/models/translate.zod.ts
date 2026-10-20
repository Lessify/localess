import { z } from 'zod';

import type { TranslateData } from './translate.model.js';

const zFormat = z.enum(['text', 'html']).optional();

/**
 * `POST /api/app/translate`: one string, or a batch of items. Checked against `TranslateData`, which stays written by
 * hand: its `?: never` members refuse a body with both `content` and `items`, which the inferred union would not.
 */
export const zTranslateData = z.union([
  z.object({ sourceLocale: z.string().min(1), targetLocale: z.string().min(1), content: z.string(), format: zFormat }),
  z.object({
    sourceLocale: z.string().min(1),
    targetLocale: z.string().min(1),
    items: z.array(z.object({ id: z.string(), content: z.string(), format: zFormat })).max(5000),
  }),
]) satisfies z.ZodType<TranslateData>;
