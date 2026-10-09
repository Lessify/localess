import { EventEmitter } from 'node:events';
import type pg from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../database/database.module.js';
import { EventsService } from './events.service.js';

/** A pooled client that, like pg-pool, throws when it is released twice. */
class FakeClient extends EventEmitter {
  releases = 0;
  query = vi.fn(async () => ({ rows: [] }));
  release = vi.fn(() => {
    this.releases++;
    if (this.releases > 1) throw new Error('Release called on client which has already been released to the pool.');
  });
}

function setup() {
  const clients: FakeClient[] = [];
  const pool = {
    connect: vi.fn(async () => {
      const client = new FakeClient();
      clients.push(client);
      return client;
    }),
  };
  const service = new EventsService(pool as unknown as pg.Pool, {} as Database);
  return { service, clients, pool };
}

describe('EventsService listener', () => {
  afterEach(() => vi.useRealTimers());

  // Postgres stopping on SIGTERM closes the connection while Nest's shutdown releases it.
  it('releases the connection once when the server stops and Postgres closes it', async () => {
    const { service, clients } = setup();
    await service.onModuleInit();

    await service.onModuleDestroy();
    expect(() => clients[0].emit('error', new Error('terminating connection due to administrator command'))).not.toThrow();

    expect(clients[0].releases).toBe(1);
  });

  it('releases the connection once when Postgres closes it before the server stops', async () => {
    const { service, clients } = setup();
    await service.onModuleInit();

    clients[0].emit('error', new Error('terminating connection due to administrator command'));
    await service.onModuleDestroy();

    expect(clients[0].releases).toBe(1);
  });

  it('reconnects after losing the connection while running', async () => {
    vi.useFakeTimers();
    const { service, clients, pool } = setup();
    await service.onModuleInit();

    clients[0].emit('error', new Error('connection lost'));
    await vi.advanceTimersByTimeAsync(1000);

    expect(pool.connect).toHaveBeenCalledTimes(2);
    expect(clients[0].releases).toBe(1);
    expect(clients[1].query).toHaveBeenCalledWith('LISTEN localess_events');
    await service.onModuleDestroy();
    expect(clients[1].releases).toBe(1);
  });
});
