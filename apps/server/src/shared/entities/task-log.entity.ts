import type { taskLogs } from '../../infra/database/schema.js';
import type { TaskSelect } from './task.entity.js';

/** A step of a task. A `task_logs` row. */
export type TaskLogEntity = typeof taskLogs.$inferSelect;
/** A `task_logs` row to insert (defaults left out). */
export type TaskLogInsertEntity = typeof taskLogs.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type TaskLogSelect = TaskLogEntity & {
  task?: TaskSelect | null;
};
