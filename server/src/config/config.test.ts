import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses an embedded Postgres in the data dir when DATABASE_URL is unset', () => {
    const config = loadConfig({ LOCALESS_DATA_DIR: '/var/localess' });
    expect(config.database).toEqual({ embedded: { dataDir: '/var/localess/pgdata', port: 5433 } });
    expect(config.port).toBe(3000);
  });

  it('uses DATABASE_URL when set', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://u:p@db:5432/localess', PORT: '8080' });
    expect(config.database).toEqual({ url: 'postgres://u:p@db:5432/localess' });
    expect(config.port).toBe(8080);
  });

  it('defaults the static dir to the Angular build output and allows disabling it', () => {
    expect(loadConfig({}).staticDir).toBe(resolve(import.meta.dirname, '../../../dist/localess/browser'));
    expect(loadConfig({ LOCALESS_STATIC_DIR: '' }).staticDir).toBeUndefined();
  });

  it('turns the minimum log level into the list of enabled levels', () => {
    expect(loadConfig({}).logLevels).toEqual(['fatal', 'error', 'warn', 'log']);
    expect(loadConfig({ LOCALESS_LOG_LEVEL: 'error' }).logLevels).toEqual(['fatal', 'error']);
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow();
  });
});
