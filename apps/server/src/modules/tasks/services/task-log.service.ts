import { taskKindsFor, type TaskLog } from '@localess/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { toTaskLog } from '../../../shared/transformers/task.transformer.js';
import { errorMessage } from '../../../shared/utils/error-message.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TaskLogRepository } from '../repositories/task-log.repository.js';

/** The steps of a task: written while it runs (the Tasks UI and the server log), read by its detail page. */
@Injectable()
export class TaskLogService {
  // Log lines keep the context they had before the runner was split up.
  private readonly logger = new Logger('TaskRunner');

  constructor(
    private readonly spaceLookupRepository: SpaceLookupRepository,
    private readonly taskRepository: TaskRepository,
    private readonly taskLogRepository: TaskLogRepository,
  ) {}

  /** In the order they were written; 404 when the space or its task `taskId` is not there, or of a kind `user` may not read. */
  async findAll(spaceId: string, taskId: string, user: UserEntity): Promise<TaskLog[]> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
    if (!(await this.taskRepository.findOne(spaceId, taskId, taskKindsFor(user)))) throw new NotFoundException('Task not found');
    return (await this.taskLogRepository.findAll(taskId)).map(toTaskLog);
  }

  /** A step visible in the Tasks UI (`task_logs`) and in the server log. */
  async log(
    task: Pick<TaskEntity, 'kind' | 'id' | 'spaceId'>,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    trace?: string,
  ): Promise<void> {
    const line = `[Task ${task.kind} ${task.id}] ${message}`;
    if (level === 'ERROR') this.logger.error(line);
    else if (level === 'WARN') this.logger.warn(line);
    else this.logger.log(line);
    try {
      await this.taskLogRepository.create(task, level, message, trace);
    } catch (error) {
      this.logger.warn(`Could not persist task log: ${errorMessage(error)}`);
    }
  }

  /** Several steps at once (a refused import's problems), in one insert; the server log gets a summary line. */
  async logMany(
    task: Pick<TaskEntity, 'kind' | 'id' | 'spaceId'>,
    lines: { level: 'INFO' | 'WARN' | 'ERROR'; message: string; trace?: string }[],
  ): Promise<void> {
    if (!lines.length) return;
    this.logger.warn(`[Task ${task.kind} ${task.id}] ${lines[0].message} (${lines.length} lines)`);
    try {
      await this.taskLogRepository.createMany(task, lines);
    } catch (error) {
      this.logger.warn(`Could not persist task logs: ${errorMessage(error)}`);
    }
  }
}
