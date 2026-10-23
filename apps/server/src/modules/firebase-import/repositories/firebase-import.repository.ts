import type { FirebaseImportStage } from '@localess/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNotNull, lt } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { firebaseImports } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import type {
  FirebaseImportEntity,
  FirebaseImportInsertEntity,
  FirebaseImportSelect,
} from '../../../shared/entities/firebase-import.entity.js';
import { RunAbandoned } from '../utils/firebase-import.utils.js';

/** What a run's progress save may set besides its stages. */
export type FirebaseImportUpdate = Partial<Pick<FirebaseImportInsertEntity, 'status' | 'finishedAt'>>;

/**
 * The `firebase_imports` runs. One RUNNING run per install (a partial unique index); every write of the runner is
 * conditional on its run still being RUNNING, so a run failed elsewhere (recovery on another instance) cannot come back.
 */
@Injectable()
export class FirebaseImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Newest first. */
  findAll(): Promise<FirebaseImportEntity[]> {
    return this.db.query.firebaseImports.findMany({ orderBy: desc(firebaseImports.startedAt) });
  }

  findOne(id: string): Promise<FirebaseImportEntity | undefined> {
    return this.db.query.firebaseImports.findFirst({ where: eq(firebaseImports.id, id) });
  }

  /** RUNNING runs whose heartbeat is older than `before`. */
  findStale(before: Date): Promise<FirebaseImportEntity[]> {
    return this.db.query.firebaseImports.findMany({
      where: and(eq(firebaseImports.status, 'RUNNING'), lt(firebaseImports.heartbeatAt, before)),
    });
  }

  /**
   * The runs that imported these Firebase spaces, with the local `space` (finished or failed; a deleted space takes its
   * run along).
   */
  findAllImported(sourceSpaceIds: string[]): Promise<FirebaseImportSelect[]> {
    return this.db.query.firebaseImports.findMany({
      where: and(inArray(firebaseImports.sourceSpaceId, sourceSpaceIds), isNotNull(firebaseImports.spaceId)),
      with: { space: true },
    });
  }

  /** A new RUNNING run; a conflict while another one runs. */
  create(values: FirebaseImportInsertEntity, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      try {
        await t.insert(firebaseImports).values(values);
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictException('Another import is running');
        throw error;
      }
    });
  }

  /** Saves the run's stages (and status, error, end) with a fresh heartbeat; `RunAbandoned` when it no longer runs. */
  save(id: string, stages: FirebaseImportStage[], extra: FirebaseImportUpdate = {}, tx?: Transaction): Promise<void> {
    return this.update(id, { stages, heartbeatAt: new Date(), ...extra }, tx);
  }

  /** Links the run to its new space, with the space's insert; `RunAbandoned` when it no longer runs. */
  linkSpace(id: string, spaceId: string, stages: FirebaseImportStage[], tx?: Transaction): Promise<void> {
    return this.update(id, { spaceId, stages, heartbeatAt: new Date() }, tx);
  }

  /** Proves a RUNNING run alive. */
  heartbeat(id: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .update(firebaseImports)
        .set({ heartbeatAt: new Date() })
        .where(and(eq(firebaseImports.id, id), eq(firebaseImports.status, 'RUNNING')));
    });
  }

  /**
   * Fails a running run (cut off by a stopped instance, or cancelled); its runner stops at its next save. False when it
   * ended meanwhile.
   */
  fail(id: string, stages: FirebaseImportStage[], tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const failed = await t
        .update(firebaseImports)
        .set({ status: 'FAILED', stages, finishedAt: new Date() })
        .where(and(eq(firebaseImports.id, id), eq(firebaseImports.status, 'RUNNING')))
        .returning({ id: firebaseImports.id });
      return failed.length > 0;
    });
  }

  private update(id: string, values: Partial<FirebaseImportInsertEntity>, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      const updated = await t
        .update(firebaseImports)
        .set(values)
        .where(and(eq(firebaseImports.id, id), eq(firebaseImports.status, 'RUNNING')))
        .returning({ id: firebaseImports.id });
      if (!updated.length) throw new RunAbandoned();
    });
  }
}
