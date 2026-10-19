import { z } from 'zod';
import type { TranslationCreate } from '@localess/shared';
import { zTranslationKey, zTranslationValue } from '@localess/shared/zod';
import { zLabels } from '../../../infra/http/zod.js';

const zDescription = z.string().max(2000);

/** `POST /api/app/spaces/:spaceId/translations`. */
export const zTranslationCreate = z.object({
  key: zTranslationKey,
  locales: z.record(z.string(), zTranslationValue),
  labels: zLabels.optional(),
  description: zDescription.optional(),
}) satisfies z.ZodType<TranslationCreate>;

/** `PATCH …/translations/:id`: labels and description (both optional, unlike the shared `TranslationUpdate`). */
export const zTranslationPatch = z.object({ labels: zLabels.optional(), description: zDescription.optional() });
export type TranslationPatch = z.infer<typeof zTranslationPatch>;

/** `PUT …/translations/:id/locales/:locale`. */
export const zTranslationLocaleValue = z.object({ value: zTranslationValue });
export type TranslationLocaleValue = z.infer<typeof zTranslationLocaleValue>;

/** `PUT …/translations/:id/key`. */
export const zTranslationRename = z.object({ key: zTranslationKey });
export type TranslationRename = z.infer<typeof zTranslationRename>;

/** `POST …/translations/translate-locale`: machine-translate one locale into another. */
export const zTranslateLocale = z.object({
  sourceLocaleId: z.string().min(1),
  targetLocaleId: z.string().min(1),
  overwrite: z.boolean().optional(),
});
export type TranslateLocale = z.infer<typeof zTranslateLocale>;
