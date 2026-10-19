import { z } from 'zod';
import type { TranslateData } from '@localess/shared';

const zFormat = z.enum(['text', 'html']).optional();

/** `POST /api/app/translate`: one string, or a batch of items. */
export const zTranslateData = z.union([
  z.object({ sourceLocale: z.string().min(1), targetLocale: z.string().min(1), content: z.string(), format: zFormat }),
  z.object({
    sourceLocale: z.string().min(1),
    targetLocale: z.string().min(1),
    items: z.array(z.object({ id: z.string(), content: z.string(), format: zFormat })).max(5000),
  }),
]) satisfies z.ZodType<TranslateData>;
