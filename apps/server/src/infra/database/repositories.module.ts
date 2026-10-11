import { Global, Module } from '@nestjs/common';
import { TranslationSnapshotsRepository } from '../../modules/translations/repositories/translation-snapshots.repository.js';
import { TranslationsRepository } from '../../modules/translations/repositories/translations.repository.js';

/**
 * Every repository, registered once for the whole app (docs/server-architecture.md#ownership): repositories depend
 * only on the database and on each other, so any service injects any repository without importing its module.
 */
const REPOSITORIES = [TranslationsRepository, TranslationSnapshotsRepository];

@Global()
@Module({
  providers: REPOSITORIES,
  exports: REPOSITORIES,
})
export class RepositoriesModule {}
