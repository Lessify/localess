import { Injectable, Logger } from '@nestjs/common';
import { type TaskEntity, TasksRepository } from '../repositories/tasks.repository.js';

/** The steps of a running task, for the Tasks UI and the server log. */
@Injectable()
export class TaskLogService {
  // Log lines keep the context they had before the runner was split up.
  private readonly logger = new Logger('TaskRunner');

  constructor(private readonly tasks: TasksRepository) {}

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
      await this.tasks.addLog(task, level, message, trace);
    } catch (error) {
      this.logger.warn(`Could not persist task log: ${error}`);
    }
  }
}
