import { Module } from '@nestjs/common';
import { TasksController } from './controllers/tasks.controller.js';
import { AssetTransferRepository } from './repositories/asset-transfer.repository.js';
import { ContentTransferRepository } from './repositories/content-transfer.repository.js';
import { SchemaTransferRepository } from './repositories/schema-transfer.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { TranslationTransferRepository } from './repositories/translation-transfer.repository.js';
import { AssetTransferService } from './services/asset-transfer.service.js';
import { ContentTransferService } from './services/content-transfer.service.js';
import { ImportFileService } from './services/import-file.service.js';
import { SchemaTransferService } from './services/schema-transfer.service.js';
import { TaskLogService } from './services/task-log.service.js';
import { TasksService } from './services/tasks.service.js';
import { TranslationTransferService } from './services/translation-transfer.service.js';
import { TaskRunner } from './workers/task-runner.service.js';
import { TaskWorker } from './workers/task-worker.service.js';

/**
 * Background export/import jobs (was the `task-oncreate` Cloud Function). Layered (docs/server-architecture.md): its
 * own controllers, services, repositories and workers; no other feature module. The transfers read and write the
 * assets, contents, schemas and translations tables with their own queries, under the shared data rules.
 */
@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskLogService,
    ImportFileService,
    AssetTransferService,
    ContentTransferService,
    SchemaTransferService,
    TranslationTransferService,
    TaskRunner,
    TaskWorker,
    TasksRepository,
    SpaceRepository,
    AssetTransferRepository,
    ContentTransferRepository,
    SchemaTransferRepository,
    TranslationTransferRepository,
  ],
  exports: [TaskWorker],
})
export class TasksModule {}
