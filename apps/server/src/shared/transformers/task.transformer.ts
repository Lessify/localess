import type { Task, TaskLog } from '@localess/shared';
import { toDto } from './dto.transformer.js';
import type { TaskLogEntity } from '../entities/task-log.entity.js';
import type { TaskEntity } from '../entities/task.entity.js';

/** A `tasks` row as the App API's DTO: `null` columns left out, `spaceId` and the worker's lock dropped. */
export const toTask = (entity: TaskEntity): Task => toDto(entity, ['spaceId', 'lockedBy', 'lockedAt']) as unknown as Task;

/** A `task_logs` row as the App API's DTO: `null` columns left out and `taskId` dropped. */
export const toTaskLog = (entity: TaskLogEntity): TaskLog => toDto(entity, ['taskId']) as unknown as TaskLog;
