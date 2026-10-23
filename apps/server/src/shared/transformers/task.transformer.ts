import type { Task, TaskBase, TaskKind, TaskLog, TaskParams, TaskStatus, TaskUser } from '@localess/shared';

import type { TaskSelect } from '../entities/task.entity.js';
import type { TaskLogEntity } from '../entities/task-log.entity.js';
import type { UserEntity } from '../entities/user.entity.js';
import { toDto } from './dto.transformer.js';

const toTaskUser = (entity: UserEntity): TaskUser => ({
  id: entity.id,
  email: entity.email,
  ...(entity.displayName ? { displayName: entity.displayName } : {}),
});

/**
 * A `tasks` row as the App API answers it: its columns (empty ones left out), and who started it when the query loaded
 * `createdBy`. The worker's lock and heartbeat, the space and the user's id are not part of it.
 */
export function toTask(entity: TaskSelect): Task {
  const task: TaskBase & { params?: TaskParams } = {
    id: entity.id,
    // The columns hold the enums' values (their check constraints).
    kind: entity.kind as TaskKind,
    status: entity.status as TaskStatus,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.params) task.params = entity.params;
  if (entity.file) task.file = entity.file;
  if (entity.startedAt) task.startedAt = entity.startedAt.toISOString();
  if (entity.finishedAt) task.finishedAt = entity.finishedAt.toISOString();
  if (entity.createdBy) task.createdBy = toTaskUser(entity.createdBy);
  // The row's kind decides which of the union's members it is; the columns above are those that member carries.
  return task as Task;
}

/** A `task_logs` row as the App API's DTO: `null` columns left out and `taskId` dropped. */
export const toTaskLog = (entity: TaskLogEntity): TaskLog => toDto(entity, ['taskId']) as unknown as TaskLog;
