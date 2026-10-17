import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses an embedded Postgres in the data dir when DATABASE_URL is unset', () => {
    const config = loadConfig({ LOCALESS_DATA_DIR: '/var/localess' });
    expect(config.database).toEqual({ embedded: { dataDir: '/var/localess/pgdata', port: 5433 } });
    expect(config.port).toBe(3000);
  });

  it('defaults the data dir to .data in the repository root', () => {
    const root = resolve(import.meta.dirname, '../../../../..');
    expect(existsSync(resolve(root, 'pnpm-workspace.yaml'))).toBe(true);
    expect(loadConfig({}).dataDir).toBe(resolve(root, '.data'));
    expect(loadConfig({}).storageDir).toBe(resolve(root, '.data/storage'));
  });

  it('uses DATABASE_URL when set', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://u:p@db:5432/localess', PORT: '8080' });
    expect(config.database).toEqual({ url: 'postgres://u:p@db:5432/localess' });
    expect(config.port).toBe(8080);
  });

  it('defaults the static dir to the Angular build output and allows disabling it', () => {
    expect(loadConfig({}).staticDir).toBe(resolve(import.meta.dirname, '../../../../web/dist/browser'));
    expect(loadConfig({ LOCALESS_STATIC_DIR: '' }).staticDir).toBeUndefined();
  });

  it('turns the minimum log level into the list of enabled levels', () => {
    expect(loadConfig({}).logLevels).toEqual(['fatal', 'error', 'warn', 'log']);
    expect(loadConfig({ LOCALESS_LOG_LEVEL: 'error' }).logLevels).toEqual(['fatal', 'error']);
  });

  it('keeps a disk cache of image renditions unless turned off', () => {
    expect(loadConfig({}).renditionCache).toBe('disk');
    expect(loadConfig({ LOCALESS_RENDITION_CACHE: 'off' }).renditionCache).toBe('off');
    expect(() => loadConfig({ LOCALESS_RENDITION_CACHE: 'memory' })).toThrow();
  });

  it('labels the instance only when named, in primary unless a color is given', () => {
    expect(loadConfig({}).instance).toBeUndefined();
    expect(loadConfig({ LOCALESS_INSTANCE_NAME: '  ' }).instance).toBeUndefined();
    expect(loadConfig({ LOCALESS_INSTANCE_NAME: 'Test' }).instance).toEqual({ name: 'Test', color: 'primary' });
    expect(loadConfig({ LOCALESS_INSTANCE_NAME: ' Production ', LOCALESS_INSTANCE_COLOR: 'destructive' }).instance).toEqual({
      name: 'Production',
      color: 'destructive',
    });
    expect(() => loadConfig({ LOCALESS_INSTANCE_NAME: 'Test', LOCALESS_INSTANCE_COLOR: 'neon' })).toThrow(/LOCALESS_INSTANCE_COLOR/);
  });

  it('keeps webhook logs 30 days unless configured, refusing a non-positive number', () => {
    expect(loadConfig({}).webhookLogDays).toBe(30);
    expect(loadConfig({ LOCALESS_WEBHOOK_LOG_DAYS: '7' }).webhookLogDays).toBe(7);
    expect(() => loadConfig({ LOCALESS_WEBHOOK_LOG_DAYS: '0' })).toThrow(/LOCALESS_WEBHOOK_LOG_DAYS/);
  });

  it('turns test templates off unless LOCALESS_TEST_TEMPLATES=true', () => {
    expect(loadConfig({}).testTemplates).toBe(false);
    expect(loadConfig({ LOCALESS_TEST_TEMPLATES: 'true' }).testTemplates).toBe(true);
    expect(loadConfig({ LOCALESS_TEST_TEMPLATES: 'false' }).testTemplates).toBe(false);
    expect(() => loadConfig({ LOCALESS_TEST_TEMPLATES: 'yes' })).toThrow();
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow();
  });
});

describe('loadConfig: OAuth providers', () => {
  const google = { LOCALESS_GOOGLE_CLIENT_ID: 'gid', LOCALESS_GOOGLE_CLIENT_SECRET: 'gsecret' };
  const microsoft = { LOCALESS_MICROSOFT_CLIENT_ID: 'mid', LOCALESS_MICROSOFT_CLIENT_SECRET: 'msecret' };

  it('enables only listed providers that have credentials', () => {
    const config = loadConfig({ LOCALESS_AUTH_PROVIDERS: 'google', ...google, ...microsoft, LOCALESS_AUTH_CUSTOM_DOMAIN: 'example.com' });
    expect(Object.keys(config.auth.providers)).toEqual(['google']);
    expect(config.auth.providers.google).toEqual({ issuer: 'https://accounts.google.com', clientId: 'gid', clientSecret: 'gsecret' });
  });

  it('reports listed providers that are missing credentials', () => {
    const config = loadConfig({ LOCALESS_AUTH_PROVIDERS: 'GOOGLE,MICROSOFT' });
    expect(config.auth.providers).toEqual({});
    expect(config.auth.misconfigured).toHaveLength(2);
  });

  it('derives the Microsoft issuer from the tenant and refuses multi-tenant', () => {
    const tenant = loadConfig({ LOCALESS_AUTH_PROVIDERS: 'MICROSOFT', ...microsoft, LOCALESS_AUTH_CUSTOM_DOMAIN: 'contoso.com' });
    expect(tenant.auth.providers.microsoft?.issuer).toBe('https://login.microsoftonline.com/contoso.com/v2.0');

    const anyTenant = loadConfig({ LOCALESS_AUTH_PROVIDERS: 'MICROSOFT', ...microsoft, LOCALESS_AUTH_CUSTOM_DOMAIN: '*' });
    expect(anyTenant.auth.providers.microsoft).toBeUndefined();
    expect(anyTenant.auth.misconfigured[0]).toMatch(/tenant/);
    expect(anyTenant.auth.customDomain).toBe('');
  });

  it('normalises the public URL and reads SMTP settings', () => {
    const config = loadConfig({ LOCALESS_PUBLIC_URL: 'https://cms.example.com/', LOCALESS_SMTP_URL: 'smtp://mail:25' });
    expect(config.publicUrl).toBe('https://cms.example.com');
    expect(config.smtp).toEqual({ url: 'smtp://mail:25', from: 'Localess <no-reply@localhost>' });
  });
});
