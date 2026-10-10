import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { FIREBASE_IMPORT_STAGES, type FirebaseImport, type FirebaseSourceSpace } from '@localess/shared';
import type { UserRow } from '../../auth/users/users.service.js';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { firebaseImports, spaces } from '../../infra/database/schema.js';
import { FirebaseClient, FirebaseConnectionError } from './firebase-client.js';
import { FirebaseImportRunner, HEARTBEAT_MS } from './firebase-import.runner.js';

type Row = typeof firebaseImports.$inferSelect;
const isUniqueViolation = (error: unknown) =>
  (error as { cause?: { code?: string } })?.cause?.code === '23505' || (error as { code?: string })?.code === '23505';

export const toFirebaseImport = (row: Row): FirebaseImport => ({
  id: row.id,
  origin: row.origin,
  sourceSpaceId: row.sourceSpaceId,
  sourceSpaceName: row.sourceSpaceName,
  ...(row.spaceId ? { spaceId: row.spaceId } : {}),
  status: row.status as FirebaseImport['status'],
  stages: row.stages,
  ...(row.error ? { error: row.error } : {}),
  startedBy: row.startedBy,
  startedAt: row.startedAt.toISOString(),
  ...(row.finishedAt ? { finishedAt: row.finishedAt.toISOString() } : {}),
});

/** Admin → Spaces → Import from Firebase: one run at a time per install, runs kept as history. */
@Injectable()
export class FirebaseImportService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(FirebaseImportService.name);
  private recovery?: NodeJS.Timeout;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
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
    const running = await this.db
      .select()
      .from(firebaseImports)
      .where(and(eq(firebaseImports.status, 'RUNNING'), lt(firebaseImports.heartbeatAt, stale)));
    for (const run of running) {
      const current = run.stages.find(it => it.status === 'RUNNING') ?? run.stages.find(it => it.status === 'PENDING') ?? run.stages[0];
      const message = 'Interrupted: the server running it stopped';
      const stages = run.stages.map(it => (it.stage === current.stage ? { ...it, status: 'FAILED' as const, error: message } : it));
      const failed = await this.db
        .update(firebaseImports)
        .set({ status: 'FAILED', stages, error: { stage: current.stage, message }, finishedAt: new Date() })
        .where(and(eq(firebaseImports.id, run.id), eq(firebaseImports.status, 'RUNNING')))
        .returning({ id: firebaseImports.id });
      if (failed.length && run.spaceId) await this.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, run.spaceId));
    }
  }

  private client(origin: string, token: string): FirebaseClient {
    try {
      // The webhook network rules: public https hosts only, unless LOCALESS_WEBHOOK_ALLOW_INTERNAL.
      return new FirebaseClient(origin, token, { allowInternal: this.config.webhookAllowInternal });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async sourceSpaces(origin: string, token: string): Promise<FirebaseSourceSpace[]> {
    let remote: Awaited<ReturnType<FirebaseClient['spaces']>>;
    try {
      remote = await this.client(origin, token).spaces();
    } catch (error) {
      if (error instanceof FirebaseConnectionError) throw new BadGatewayException(error.message);
      throw error;
    }
    const imported = remote.length
      ? await this.db
          .select({ id: spaces.id, name: spaces.name, legacyId: spaces.legacyId })
          .from(spaces)
          .where(inArray(spaces.legacyId, remote.map(it => it.id)))
      : [];
    return remote.map(it => {
      const local = imported.find(row => row.legacyId === it.id);
      return { id: it.id, name: it.name, ...(it.createdAt ? { createdAt: it.createdAt } : {}), importedAs: local ? { id: local.id, name: local.name } : null };
    });
  }

  async start(origin: string, token: string, sourceSpaceId: string, user: UserRow): Promise<FirebaseImport> {
    const client = this.client(origin, token);
    const [existing] = await this.db.select({ name: spaces.name }).from(spaces).where(eq(spaces.legacyId, sourceSpaceId));
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
    try {
      await this.db.insert(firebaseImports).values({
        id,
        origin: client.origin,
        sourceSpaceId,
        sourceSpaceName: source.name,
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: user.displayName ?? user.email, email: user.email },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Another import is running');
      throw error;
    }
    // In the background: the caller polls GET /:id. The runner records every outcome itself.
    void this.runner.execute(id, client, sourceSpaceId).catch(error => this.logger.error(error));
    return this.get(id);
  }

  async list(): Promise<FirebaseImport[]> {
    return (await this.db.select().from(firebaseImports).orderBy(desc(firebaseImports.startedAt))).map(toFirebaseImport);
  }

  async get(id: string): Promise<FirebaseImport> {
    const [row] = isUuid(id) ? await this.db.select().from(firebaseImports).where(eq(firebaseImports.id, id)) : [];
    if (!row) throw new NotFoundException('Import not found');
    return toFirebaseImport(row);
  }
}
