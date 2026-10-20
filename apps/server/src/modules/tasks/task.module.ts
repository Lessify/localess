import { Module } from '@nestjs/common';

import { TaskController } from './controllers/task.controller.js';
import { TaskLogController } from './controllers/task-log.controller.js';
import { AssetTransferRepository } from './repositories/asset-transfer.repository.js';
import { SchemaTransferRepository } from './repositories/schema-transfer.repository.js';
import { TaskRepository } from './repositories/task.repository.js';
import { TaskLogRepository } from './repositories/task-log.repository.js';
import { TranslationTransferRepository } from './repositories/translation-transfer.repository.js';
import { AssetTransferService } from './services/asset-transfer.service.js';
import { ImportFileService } from './services/import-file.service.js';
import { SchemaTransferService } from './services/schema-transfer.service.js';
import { TaskService } from './services/task.service.js';
import { TaskLogService } from './services/task-log.service.js';
import { TranslationTransferService } from './services/translation-transfer.service.js';
import { TaskRunner } from './workers/task-runner.service.js';
import { TaskWorker } from './workers/task-worker.service.js';

/**
 * Background export/import jobs (was the `task-oncreate` Cloud Function). Layered (docs/server/architecture.md): its
 * own controllers, services, repositories and workers; no other feature module. The transfers read and write the
 * assets, contents, schemas and translations tables with their own queries, under the shared data rules.
 */
@Module({
  controllers: [TaskController, TaskLogController],
  providers: [
    TaskService,
    TaskLogService,
    ImportFileService,
    AssetTransferService,
    SchemaTransferService,
    TranslationTransferService,
    TaskRunner,
    TaskWorker,
    TaskRepository,
    TaskLogRepository,
    AssetTransferRepository,
    SchemaTransferRepository,
    TranslationTransferRepository,
  ],
  exports: [TaskWorker],
})
export class TaskModule {}
