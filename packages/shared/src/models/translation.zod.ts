import { isTranslationKey, TRANSLATION_VALUE_MAX_LENGTH } from './translation.model.js';
import { z } from 'zod';
import { zLabels } from './common.zod.js';

/** A key a translation is created with or renamed to (`isTranslationKey`). */
export const zTranslationKey = z.string().refine(isTranslationKey, {
  message: 'Must start with a letter, end with a letter or digit, and use only letters, digits, -, _ and . (at most 150)',
});

export const zTranslationValue = z.string().max(TRANSLATION_VALUE_MAX_LENGTH);

// The keys of files and pushes may name existing translations, so the key rule is checked only for the ones created.
// A `type` in files exported before translations became plain text only is ignored.
export const translationSchema = z.object({
  id: z.string(),
  locales: z.record(z.string(), zTranslationValue),
  labels: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const zTranslationExportArraySchema = z.array(translationSchema);

export const zTranslationFlatExportSchema = z.record(z.string(), zTranslationValue);

export const zTranslationManageUpdateSchema = z.object({
  dryRun: z.boolean().optional(),
  type: z.enum(['add-missing', 'update-existing', 'delete-missing-key', 'delete-missing-value']),
  values: z.record(z.string(), zTranslationValue),
});

// App API requests.

const zDescription = z.string().max(2000);

/** `POST /api/app/spaces/:spaceId/translations`. */
export const zTranslationCreate = z.object({
  key: zTranslationKey,
  locales: z.record(z.string(), zTranslationValue),
  labels: zLabels.optional(),
  description: zDescription.optional(),
});
export type TranslationCreate = z.infer<typeof zTranslationCreate>;

/** `PATCH …/translations/:id`: labels and description. */
export const zTranslationUpdate = z.object({ labels: zLabels.optional(), description: zDescription.optional() });
export type TranslationUpdate = z.infer<typeof zTranslationUpdate>;

/** `PUT …/translations/:id/locales/:locale`. */
export const zTranslationLocaleUpdate = z.object({ value: zTranslationValue });
export type TranslationLocaleUpdate = z.infer<typeof zTranslationLocaleUpdate>;

/** `PUT …/translations/:id/key`. */
export const zTranslationRename = z.object({ key: zTranslationKey });
export type TranslationRename = z.infer<typeof zTranslationRename>;

/** `POST …/translations/translate-locale`: machine-translate one locale into another. */
export const zTranslationTranslateLocale = z.object({
  sourceLocaleId: z.string().min(1),
  targetLocaleId: z.string().min(1),
  /** Replace target values that already exist instead of filling only the empty ones. */
  overwrite: z.boolean().optional(),
});
export type TranslationTranslateLocale = z.infer<typeof zTranslationTranslateLocale>;
