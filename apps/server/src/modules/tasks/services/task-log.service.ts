import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { TaskLog } from '@localess/shared';
import { toTaskLog } from '../../../shared/transformers/task.transformer.js';
import { TaskLogRepository } from '../repositories/task-log.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';

/** The steps of a task: written while it runs (the Tasks UI and the server log), read by its detail page. */
@Injectable()
export class TaskLogService {
  // Log lines keep the context they had before the runner was split up.
  private readonly logger = new Logger('TaskRunner');

  constructor(
    private readonly tasks: TaskRepository,
    private readonly logs: TaskLogRepository,
  ) {}

  /** In the order they were written; 404 when the space has no task `taskId`. */
  async findAll(spaceId: string, taskId: string): Promise<TaskLog[]> {
    if (!(await this.tasks.findById(spaceId, taskId))) throw new NotFoundException('Task not found');
    return (await this.logs.findAll(taskId)).map(toTaskLog);
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
      await this.logs.create(task, level, message, trace);
    } catch (error) {
      this.logger.warn(`Could not persist task log: ${error}`);
    }
  }
}
