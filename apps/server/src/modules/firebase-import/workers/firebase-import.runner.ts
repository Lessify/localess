import { Injectable, Logger } from '@nestjs/common';
import type { FirebaseImportStage, FirebaseImportStageName } from '@localess/shared';
import { type FirebaseImportUpdate, FirebaseImportsRepository } from '../repositories/firebase-imports.repository.js';
import { AssetImportService } from '../services/asset-import.service.js';
import { ContentImportService } from '../services/content-import.service.js';
import { ReferenceRewriteService } from '../services/reference-rewrite.service.js';
import { SchemaImportService } from '../services/schema-import.service.js';
import { SpaceImportService } from '../services/space-import.service.js';
import { TokenImportService } from '../services/token-import.service.js';
import { TranslationImportService } from '../services/translation-import.service.js';
import { WebhookImportService } from '../services/webhook-import.service.js';
import type { FirebaseClient } from '../utils/firebase-client.js';
import { HEARTBEAT_MS, type ImportStage, RunAbandoned, StageFailure } from '../utils/firebase-import.utils.js';

const MAX_WARNINGS = 50;

/**
 * Executes one import run (Admin → Spaces → Import from Firebase): the stages of the spec in order, each recorded on
 * the `firebase_imports` row as it progresses. The space is created first, linked to the run: it reads as importing
 * while the run is RUNNING, and a failure leaves it failed (for inspection, then deletion) with the failing stage.
 * Each stage's work is its service's; this keeps the run's stages, progress, heartbeat and outcome.
 */
@Injectable()
export class FirebaseImportRunner {
  private readonly logger = new Logger(FirebaseImportRunner.name);

  constructor(
    private readonly runs: FirebaseImportsRepository,
    private readonly space: SpaceImportService,
    private readonly tokens: TokenImportService,
    private readonly webhooks: WebhookImportService,
    private readonly translations: TranslationImportService,
    private readonly schemas: SchemaImportService,
    private readonly assets: AssetImportService,
    private readonly contents: ContentImportService,
    private readonly references: ReferenceRewriteService,
  ) {}

  async execute(runId: string, client: FirebaseClient, sourceSpaceId: string): Promise<void> {
    const run = await this.runs.findById(runId);
    if (!run || run.status !== 'RUNNING') return;
    const stages: FirebaseImportStage[] = run.stages.map(it => ({ ...it }));
    let current: FirebaseImportStageName = 'space';
    // Every write is conditional on the run still being RUNNING, so a run failed elsewhere cannot come back.
    const save = (extra: FirebaseImportUpdate = {}) => this.runs.save(runId, stages, extra);
    const heartbeat = setInterval(() => {
      void this.runs.heartbeat(runId).catch(error => this.logger.warn(`Import ${runId} heartbeat failed: ${(error as Error).message}`));
    }, HEARTBEAT_MS);
    const stage = (name: FirebaseImportStageName) => stages.find(it => it.stage === name)!;
    const begin = async (name: FirebaseImportStageName) => {
      current = name;
      stage(name).status = 'RUNNING';
      await save();
    };
    const done = async (name: FirebaseImportStageName, count: number) => {
      Object.assign(stage(name), { status: 'DONE', count });
      await save();
    };
    const warn = (name: FirebaseImportStageName, message: string) => {
      const it = stage(name);
      it.warningCount = (it.warningCount ?? 0) + 1;
      if ((it.warnings ??= []).length < MAX_WARNINGS) it.warnings.push(message);
    };
    /** The stage as its service sees it: warnings and progress land on `name`. */
    const context = (name: FirebaseImportStageName, spaceId: string): ImportStage => ({
      client,
      sourceSpaceId,
      spaceId,
      warn: message => warn(name, message),
      progress: async count => {
        stage(name).count = count;
        await save();
      },
      total: total => {
        stage(name).total = total;
      },
    });

    try {
      // 1 space
      await begin('space');
      const space = await this.space.importSpace(runId, client, sourceSpaceId, stages);
      const sid = space.id;
      await done('space', 1);

      // 2 locales, 3 environments (set with the space; counted separately for the progress view)
      await begin('locales');
      await done('locales', this.space.reportLocales(space, context('locales', sid)));
      await begin('environments');
      await done('environments', await this.space.importEnvironments(space, context('environments', sid)));

      // 4 tokens
      await begin('tokens');
      await done('tokens', await this.tokens.import(context('tokens', sid)));

      // 5 webhooks, disabled: both environments may run in parallel
      await begin('webhooks');
      await done('webhooks', await this.webhooks.import(context('webhooks', sid)));

      // 6 translations
      await begin('translations');
      await done('translations', await this.translations.import(context('translations', sid)));

      // 7 schemas
      await begin('schemas');
      await done('schemas', await this.schemas.import(context('schemas', sid)));

      // 8 assets: ids first, so folder paths can be mapped; then rows and files
      await begin('assets');
      const assets = await this.assets.import(context('assets', sid));
      await done('assets', assets.count);

      // 9 contents, as stored, page by page; references are rewritten in the next stage. Only the id map is kept.
      await begin('contents');
      const contents = await this.contents.import(context('contents', sid));
      await done('contents', contents.count);

      // 10 content migration, in pages of the space's rows
      await begin('contentMigration');
      await done(
        'contentMigration',
        await this.references.rewrite(context('contentMigration', sid), { assets: assets.ids, contents: contents.ids }),
      );

      await this.space.dropContentSnapshots(sid);
      await save({ status: 'FINISHED', finishedAt: new Date() });
      await this.space.announce(sid);
    } catch (error) {
      if (error instanceof RunAbandoned) {
        this.logger.warn(`Import ${runId} ended elsewhere while running (cancelled, or failed as interrupted); stopped`);
        return;
      }
      const failedStage = error instanceof StageFailure ? error.stage : current;
      const message = (error as Error).message;
      this.logger.warn(`Import ${runId} failed at ${failedStage}: ${message}`);
      Object.assign(stage(failedStage), { status: 'FAILED', error: message });
      await save({ status: 'FAILED', error: { stage: failedStage, message }, finishedAt: new Date() }).catch(() => undefined);
    } finally {
      clearInterval(heartbeat);
    }
  }
}
