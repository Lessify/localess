import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module.js';
import { TaskRunner } from './task-runner.service.js';
import { TaskWorker } from './task-worker.service.js';
import { TasksController } from './tasks.controller.js';

/** Background export/import jobs (was the `task-oncreate` Cloud Function). */
@Module({
  imports: [AssetsModule],
  controllers: [TasksController],
  providers: [TaskRunner, TaskWorker],
  exports: [TaskWorker],
})
export class TasksModule {}
