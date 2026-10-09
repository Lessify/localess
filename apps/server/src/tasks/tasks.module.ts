import { Module } from '@nestjs/common';
import { AppApiModule } from '../app-api/app-api.module.js';
import { TaskRunner } from './task-runner.service.js';
import { TaskWorker } from './task-worker.service.js';

/** Background export/import jobs (was the `task-oncreate` Cloud Function). */
@Module({
  imports: [AppApiModule],
  providers: [TaskRunner, TaskWorker],
  exports: [TaskWorker],
})
export class TasksModule {}
