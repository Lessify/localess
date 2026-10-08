import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import pg from 'pg';
import { filter, Observable, Subject } from 'rxjs';
import { DATABASE, Database, PG_POOL } from '../database/database.module.js';

export const EVENTS_CHANNEL = 'localess_events';

/**
 * A change the UI should react to (replaces Firestore realtime listeners). Deliberately tiny: Postgres
 * NOTIFY payloads are capped at 8 kB, and clients refetch what they display rather than trusting the event.
 */
export interface ChangeEvent {
  /** null for data outside spaces (users, settings, the space list itself). */
  spaceId: string | null;
  /** Table-like name: 'spaces', 'contents', 'schemas', 'translations', 'assets', 'tasks', 'tokens', 'webhooks', 'users', 'settings', … */
  entity: string;
  id?: string;
  op: 'created' | 'updated' | 'deleted';
}

/** The Drizzle database or one of its transactions. */
export interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

/**
 * Publishes and fans out change events through Postgres LISTEN/NOTIFY, so every instance sees every
 * change. `publish` inside a transaction is delivered on commit only — exactly the "after commit"
 * semantics the UI needs.
 */
@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly events = new Subject<ChangeEvent>();
  private listener: pg.PoolClient | undefined;
  private closing = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.listen();
  }

  private async listen(): Promise<void> {
    const client = await this.pool.connect();
    client.on('notification', message => {
      if (message.channel !== EVENTS_CHANNEL || !message.payload) return;
      try {
        this.events.next(JSON.parse(message.payload) as ChangeEvent);
      } catch (error) {
        this.logger.warn(`Ignoring malformed event: ${error}`);
      }
    });
    client.on('error', error => {
      this.logger.error(`Event listener connection lost: ${error.message}`);
      client.release(true);
      this.listener = undefined;
      // Reconnect; events published meanwhile are lost, clients recover on their next refetch.
      if (!this.closing) setTimeout(() => void this.listen().catch(e => this.logger.error(e)), 1000);
    });
    await client.query(`LISTEN ${EVENTS_CHANNEL}`);
    this.listener = client;
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    this.events.complete();
    if (this.listener) {
      await this.listener.query(`UNLISTEN ${EVENTS_CHANNEL}`).catch(() => undefined);
      this.listener.release();
    }
  }

  /** Queues `event`. Pass the transaction to deliver it only if (and when) the transaction commits. */
  async publish(event: ChangeEvent, executor: SqlExecutor = this.db): Promise<void> {
    await executor.execute(sql`select pg_notify(${EVENTS_CHANNEL}, ${JSON.stringify(event)})`);
  }

  /** Events for one space plus global ones (spaceId null); every event when `spaceId` is undefined. */
  stream(spaceId?: string): Observable<ChangeEvent> {
    return this.events.pipe(filter(event => spaceId === undefined || event.spaceId === null || event.spaceId === spaceId));
  }
}
