import { z } from 'zod';

import { zLabels } from './common.zod.js';
import { isTranslationKey, TRANSLATION_VALUE_MAX_LENGTH } from './translation.model.js';

/** A key a translation is created with or renamed to (`isTranslationKey`). */
export const zTranslationKey = z.string().refine(isTranslationKey, {
  message: 'Must start with a letter, end with a letter or digit, and use only letters, digits, -, _ and . (at most 150)',
});

export const zTranslationValue = z.string().max(TRANSLATION_VALUE_MAX_LENGTH);

// The keys of files and pushes may name existing translations, so the key rule is checked only for the ones created.
// Files and pushes stay tolerant (not strict): a file exported before (its `type`) still imports, and a CLI of another
// version may send a field this one doesn't know.

/** One entry of an export file (`zTranslationFile`): the key as `id`. */
export const zTranslationFileEntry = z.object({
  id: z.string(),
  locales: z.record(z.string(), zTranslationValue),
  labels: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/** An export file: the entries with every locale. */
export const zTranslationFile = z.array(zTranslationFileEntry);

/** A flat export file: one locale's values by key. */
export const zTranslationFlatFile = z.record(z.string(), zTranslationValue);

/** `POST /api/manage/v1/spaces/:spaceId/translations/:locale`: the CLI's push. */
export const zTranslationPush = z.object({
  dryRun: z.boolean().optional(),
  type: z.enum(['add-missing', 'update-existing', 'delete-missing-key', 'delete-missing-value']),
  values: z.record(z.string(), zTranslationValue),
});
export type TranslationPush = z.infer<typeof zTranslationPush>;

// App API requests: strict, an unknown field is a 400.

const zDescription = z.string().max(2000);

/** `POST /api/app/spaces/:spaceId/translations`. */
export const zTranslationCreate = z.strictObject({
  key: zTranslationKey,
  locales: z.record(z.string(), zTranslationValue),
  labels: zLabels.optional(),
  description: zDescription.optional(),
});
export type TranslationCreate = z.infer<typeof zTranslationCreate>;

/** `PATCH …/translations/:id`: labels and description. */
export const zTranslationUpdate = z.strictObject({ labels: zLabels.optional(), description: zDescription.optional() });
export type TranslationUpdate = z.infer<typeof zTranslationUpdate>;

/** `PUT …/translations/:id/locales/:locale`. */
export const zTranslationLocaleUpdate = z.strictObject({ value: zTranslationValue });
export type TranslationLocaleUpdate = z.infer<typeof zTranslationLocaleUpdate>;

/** `PUT …/translations/:id/key`. */
export const zTranslationRename = z.strictObject({ key: zTranslationKey });
export type TranslationRename = z.infer<typeof zTranslationRename>;

/** `POST …/translations/translate-locale`: machine-translate one locale into another. */
export const zTranslationTranslateLocale = z.strictObject({
  sourceLocaleId: z.string().min(1),
  targetLocaleId: z.string().min(1),
  /** Replace target values that already exist instead of filling only the empty ones. */
  overwrite: z.boolean().optional(),
});
export type TranslationTranslateLocale = z.infer<typeof zTranslationTranslateLocale>;
