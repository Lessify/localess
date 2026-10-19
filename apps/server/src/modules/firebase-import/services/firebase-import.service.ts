import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { FIREBASE_IMPORT_STAGES, type FirebaseImport, type FirebaseSourceSpace } from '@localess/shared';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { toFirebaseImport } from '../../../shared/transformers/firebase-import.transformer.js';
import { FirebaseImportRepository } from '../repositories/firebase-import.repository.js';
import { FirebaseClient, FirebaseConnectionError } from '../utils/firebase-client.js';
import { HEARTBEAT_MS } from '../utils/firebase-import.utils.js';
import { FirebaseImportRunner } from '../workers/firebase-import.runner.js';
import type { FirebaseImportEntity } from '../../../shared/entities/firebase-import.entity.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';

/** Admin → Spaces → Import from Firebase: one run at a time per install, runs kept as history. */
@Injectable()
export class FirebaseImportService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(FirebaseImportService.name);
  private recovery?: NodeJS.Timeout;

  constructor(
    private readonly runs: FirebaseImportRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly runner: FirebaseImportRunner,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.failInterrupted();
    // Any instance notices a run whose instance stopped, not only one that restarts.
    this.recovery = setInterval(() => void this.failInterrupted().catch(error => this.logger.error(error)), 60_000);
    this.recovery.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.recovery);
  }

  /**
   * A RUNNING run whose heartbeat is older than a few heartbeats was cut off (its instance stopped or restarted): failed
   * at the stage it reached. A run another instance is still executing keeps a fresh heartbeat and is left alone.
   */
  async failInterrupted(): Promise<void> {
    const stale = new Date(Date.now() - 4 * HEARTBEAT_MS);
    const running = await this.runs.findStale(stale);
    for (const run of running) await this.failAtCurrentStage(run, 'Interrupted: the server running it stopped');
  }

  /** Stops a running import: failed at the stage it reached; the half-imported space is deleted like any failed one. */
  async cancel(id: string, user: UserEntity): Promise<FirebaseImport> {
    const run = isUuid(id) ? await this.runs.findById(id) : undefined;
    if (!run) throw new NotFoundException('Import not found');
    const cancelled = run.status === 'RUNNING' ? await this.failAtCurrentStage(run, `Cancelled by ${user.email}`) : undefined;
    if (!cancelled) throw new ConflictException('The import is not running');
    return toFirebaseImport(cancelled);
  }

  /** `undefined` when the run ended meanwhile. */
  private failAtCurrentStage(run: FirebaseImportEntity, message: string): Promise<FirebaseImportEntity | undefined> {
    const current = run.stages.find(it => it.status === 'RUNNING') ?? run.stages.find(it => it.status === 'PENDING') ?? run.stages[0];
    const stages = run.stages.map(it => (it.stage === current.stage ? { ...it, status: 'FAILED' as const, error: message } : it));
    return this.runs.fail(run.id, stages);
  }

  private client(origin: string, token: string): FirebaseClient {
    try {
      // The webhook network rules: public https hosts only, unless LOCALESS_WEBHOOK_ALLOW_INTERNAL.
      return new FirebaseClient(origin, token, { allowInternal: this.config.webhookAllowInternal });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async findSourceSpaces(origin: string, token: string): Promise<FirebaseSourceSpace[]> {
    let remote: Awaited<ReturnType<FirebaseClient['spaces']>>;
    try {
      remote = await this.client(origin, token).spaces();
    } catch (error) {
      if (error instanceof FirebaseConnectionError) throw new BadGatewayException(error.message);
      throw error;
    }
    const imported = remote.length ? await this.importedAs(remote.map(it => it.id)) : [];
    return remote.map(it => {
      const local = imported.find(row => row.legacyId === it.id);
      return {
        id: it.id,
        name: it.name,
        ...(it.createdAt ? { createdAt: it.createdAt } : {}),
        importedAs: local ? { id: local.id, name: local.name } : null,
      };
    });
  }

  async start(origin: string, token: string, sourceSpaceId: string, user: UserEntity): Promise<FirebaseImport> {
    const client = this.client(origin, token);
    const [existing] = await this.importedAs([sourceSpaceId]);
    if (existing) throw new ConflictException(`This space is already imported as '${existing.name}'`);
    let source: { id: string; name: string } | undefined;
    try {
      source = (await client.spaces()).find(it => it.id === sourceSpaceId);
    } catch (error) {
      if (error instanceof FirebaseConnectionError) throw new BadGatewayException(error.message);
      throw error;
    }
    if (!source) throw new NotFoundException('No such space in the Firebase environment');
    const id = newUuid();
    // A conflict while another import runs (one RUNNING run per install).
    await this.runs.create({
      id,
      origin: client.origin,
      sourceSpaceId,
      sourceSpaceName: source.name,
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: user.displayName ?? user.email, email: user.email },
    });
    // In the background: the caller polls GET /:id. The runner records every outcome itself.
    void this.runner.execute(id, client, sourceSpaceId).catch(error => this.logger.error(error));
    return this.findOne(id);
  }

  /** The local spaces imported from these Firebase spaces (finished or failed; a deleted space takes its run along). */
  private importedAs(sourceSpaceIds: string[]): Promise<{ id: string; name: string; legacyId: string }[]> {
    return this.runs.findImportedAs(sourceSpaceIds);
  }

  async findAll(): Promise<FirebaseImport[]> {
    return (await this.runs.findAll()).map(toFirebaseImport);
  }

  async findOne(id: string): Promise<FirebaseImport> {
    const row = isUuid(id) ? await this.runs.findById(id) : undefined;
    if (!row) throw new NotFoundException('Import not found');
    return toFirebaseImport(row);
  }
}
