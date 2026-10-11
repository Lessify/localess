import { Module } from '@nestjs/common';
import { FirebaseImportController } from './controllers/firebase-import.controller.js';
import { AssetImportRepository } from './repositories/asset-import.repository.js';
import { ContentImportRepository } from './repositories/content-import.repository.js';
import { FirebaseImportsRepository } from './repositories/firebase-imports.repository.js';
import { SchemaImportRepository } from './repositories/schema-import.repository.js';
import { SpaceImportRepository } from './repositories/space-import.repository.js';
import { TokenImportRepository } from './repositories/token-import.repository.js';
import { TranslationImportRepository } from './repositories/translation-import.repository.js';
import { WebhookImportRepository } from './repositories/webhook-import.repository.js';
import { AssetImportService } from './services/asset-import.service.js';
import { ContentImportService } from './services/content-import.service.js';
import { FirebaseImportService } from './services/firebase-import.service.js';
import { ReferenceRewriteService } from './services/reference-rewrite.service.js';
import { SchemaImportService } from './services/schema-import.service.js';
import { SpaceImportService } from './services/space-import.service.js';
import { TokenImportService } from './services/token-import.service.js';
import { TranslationImportService } from './services/translation-import.service.js';
import { WebhookImportService } from './services/webhook-import.service.js';
import { FirebaseImportRunner } from './workers/firebase-import.runner.js';

/**
 * Admin → Spaces → Import from Firebase. Layered (docs/server-architecture.md) and deliberately self-contained: it
 * writes every table of a space (spaces, locales, environments, tokens, webhooks, translations, schemas, assets and
 * their files, contents) with its own repositories, written for the import, and uses no other feature module. It
 * still follows the shared data rules (the content `cv` bump at the end).
 */
@Module({
  controllers: [FirebaseImportController],
  providers: [
    FirebaseImportService,
    SpaceImportService,
    TokenImportService,
    WebhookImportService,
    TranslationImportService,
    SchemaImportService,
    AssetImportService,
    ContentImportService,
    ReferenceRewriteService,
    FirebaseImportRunner,
    FirebaseImportsRepository,
    SpaceImportRepository,
    TokenImportRepository,
    WebhookImportRepository,
    TranslationImportRepository,
    SchemaImportRepository,
    AssetImportRepository,
    ContentImportRepository,
  ],
  exports: [FirebaseImportRunner],
})
export class FirebaseImportModule {}
