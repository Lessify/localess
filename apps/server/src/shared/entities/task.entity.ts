import type { tasks } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';
import type { TaskLogSelect } from './task-log.entity.js';
import type { UserSelect } from './user.entity.js';

/** An export, import or metadata task (the queue the task worker claims from). A `tasks` row. */
export type TaskEntity = typeof tasks.$inferSelect;
/** A `tasks` row to insert (defaults left out). */
export type TaskInsertEntity = typeof tasks.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type TaskSelect = TaskEntity & {
  space?: SpaceSelect | null;
  logs?: TaskLogSelect[] | null;
  createdBy?: UserSelect | null;
};
