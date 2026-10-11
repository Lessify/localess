import type { Task, TaskLog } from '@localess/shared';
import type { taskLogs, tasks } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

type TaskEntity = typeof tasks.$inferSelect;
type TaskLogEntity = typeof taskLogs.$inferSelect;

/** A `tasks` row as the App API's DTO: `null` columns left out, `spaceId` and the worker's lock dropped. */
export const toTask = (entity: TaskEntity): Task => toDto(entity, ['spaceId', 'lockedBy', 'lockedAt']) as unknown as Task;

/** A `task_logs` row as the App API's DTO: `null` columns left out and `taskId` dropped. */
export const toTaskLog = (entity: TaskLogEntity): TaskLog => toDto(entity, ['taskId']) as unknown as TaskLog;
