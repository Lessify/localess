import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';
import { TASK_SORT_FIELDS, TaskKind, TaskStatus, TRANSLATION_IMPORT_TYPES, type TranslationTranslateParams } from './task.model.js';

// App API requests of tasks.

/** `GET /api/app/spaces/:spaceId/tasks`: newest first unless asked otherwise; `kind` and `status` repeat for several values. */
export const zTaskPageable = zPageable(TASK_SORT_FIELDS, 'createdAt', 'desc').extend({
  search: zSearch,
  kind: zMultiValue(Object.values(TaskKind) as [TaskKind, ...TaskKind[]]).optional(),
  status: zMultiValue(Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]]).optional(),
});
export type TaskPageable = z.infer<typeof zTaskPageable>;

/** A translate-locale task's input (`TranslationTranslateParams`). */
export const zTranslationTranslateParams = z.strictObject({
  type: z.literal('translation-translate'),
  sourceLocale: z.string().min(1).max(64),
  targetLocale: z.string().min(1).max(64),
  overwrite: z.boolean().default(false),
}) satisfies z.ZodType<TranslationTranslateParams, unknown>;

/**
 * `POST …/tasks`: the tasks without an upload. Contents and assets are no longer exported here (the full export, later);
 * a translation export is the whole `.localess.zip` (one locale as key-value JSON is a direct download).
 */
export const zTaskCreate = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(TaskKind.SCHEMA_EXPORT) }),
  z.strictObject({ kind: z.literal(TaskKind.TRANSLATION_EXPORT) }),
  z.strictObject({ kind: z.literal(TaskKind.ASSET_REGEN_METADATA) }),
  z.strictObject({ kind: z.literal(TaskKind.TRANSLATION_TRANSLATE), params: zTranslationTranslateParams }),
]);
export type TaskCreate = z.infer<typeof zTaskCreate>;

/**
 * `POST …/tasks/import`: the multipart fields before the `file` part. A translation import names its `format` (`full`:
 * a `.localess.zip` or an old `.llt.zip`; `json-flat`: one locale as key-value JSON, with its `locale`); a schema import
 * takes neither.
 */
export const zTaskImportCreate = z
  .strictObject({
    kind: z.enum([TaskKind.SCHEMA_IMPORT, TaskKind.TRANSLATION_IMPORT]),
    type: z.enum(TRANSLATION_IMPORT_TYPES).optional(),
    locale: z.string().min(1).max(64).optional(),
  })
  .superRefine((fields, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (fields.kind === TaskKind.SCHEMA_IMPORT) {
      if (fields.type) issue('type', 'A schema import takes no type');
      if (fields.locale) issue('locale', 'A schema import takes no locale');
      return;
    }
    if (!fields.type) issue('type', 'Required');
    else if (fields.type === 'translation-json-flat' && !fields.locale) issue('locale', 'Required with translation-json-flat');
    else if (fields.type === 'translation-full' && fields.locale) issue('locale', 'Not with translation-full: the file holds every locale');
  });
export type TaskImportCreate = z.infer<typeof zTaskImportCreate>;
