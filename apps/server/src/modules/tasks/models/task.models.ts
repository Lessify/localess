import { z } from 'zod';
import { TaskKind, TaskStatus } from '@localess/shared';
import { zMultiValue, zPageable } from '@localess/shared/zod';

/** The field the Tasks page may sort by: newest first by default. */
export const TASK_SORT_FIELDS = ['createdAt'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

/** `GET /api/app/spaces/:spaceId/tasks`: newest first unless asked otherwise; `kind` and `status` repeat for several values. */
export const zTaskPageable = zPageable(TASK_SORT_FIELDS, 'createdAt', 'desc').extend({
  search: z.string().trim().max(200).optional(),
  kind: zMultiValue(Object.values(TaskKind) as [TaskKind, ...TaskKind[]]).optional(),
  status: zMultiValue(Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]]).optional(),
});
export type TaskPageable = z.infer<typeof zTaskPageable>;

/** `POST …/tasks`: exports and metadata regeneration, `{ kind, path? | locale? }`. */
export const zTaskExportCreate = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ASSET_EXPORT'), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal('CONTENT_EXPORT'), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal('SCHEMA_EXPORT') }),
  z.object({ kind: z.literal('TRANSLATION_EXPORT'), locale: z.string().max(64).optional() }),
  z.object({ kind: z.literal('ASSET_REGEN_METADATA') }),
]);
export type TaskExportCreate = z.infer<typeof zTaskExportCreate>;

/** `POST …/tasks/import`: the multipart fields before the `file` part. */
export const zTaskImportFields = z.object({
  kind: z.enum(['ASSET_IMPORT', 'CONTENT_IMPORT', 'SCHEMA_IMPORT', 'TRANSLATION_IMPORT']),
  /** Translation import of one locale from a flat JSON file. */
  locale: z.string().max(64).optional(),
});
export type TaskImportFields = z.infer<typeof zTaskImportFields>;
