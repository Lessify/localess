import { isTranslationKey, TRANSLATION_VALUE_MAX_LENGTH } from './translation.model.js';
import { z } from 'zod';

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
