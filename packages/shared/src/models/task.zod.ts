import { z } from 'zod';
import { zMultiValue, zPageable } from './page.zod.js';
import { TASK_SORT_FIELDS, TaskKind, TaskStatus } from './task.model.js';

// App API requests of tasks.

/** `GET /api/app/spaces/:spaceId/tasks`: newest first unless asked otherwise; `kind` and `status` repeat for several values. */
export const zTaskPageable = zPageable(TASK_SORT_FIELDS, 'createdAt', 'desc').extend({
  search: z.string().trim().max(200).optional(),
  kind: zMultiValue(Object.values(TaskKind) as [TaskKind, ...TaskKind[]]).optional(),
  status: zMultiValue(Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]]).optional(),
});
export type TaskPageable = z.infer<typeof zTaskPageable>;

/** `POST …/tasks`: exports and metadata regeneration, `{ kind, path? | locale? }`. */
export const zTaskCreate = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(TaskKind.ASSET_EXPORT), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal(TaskKind.CONTENT_EXPORT), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal(TaskKind.SCHEMA_EXPORT) }),
  z.object({ kind: z.literal(TaskKind.TRANSLATION_EXPORT), locale: z.string().max(64).optional() }),
  z.object({ kind: z.literal(TaskKind.ASSET_REGEN_METADATA) }),
]);
export type TaskCreate = z.infer<typeof zTaskCreate>;

/** `POST …/tasks/import`: the multipart fields before the `file` part. */
export const zTaskImportCreate = z.object({
  kind: z.enum([TaskKind.ASSET_IMPORT, TaskKind.CONTENT_IMPORT, TaskKind.SCHEMA_IMPORT, TaskKind.TRANSLATION_IMPORT]),
  /** Translation import of one locale from a flat JSON file. */
  locale: z.string().max(64).optional(),
});
export type TaskImportCreate = z.infer<typeof zTaskImportCreate>;
