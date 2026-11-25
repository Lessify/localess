import { resolve } from 'node:path';

import { INSTANCE_COLORS, type InstanceLabel, type IntegrationId, type TranslatePrimary } from '@localess/shared';
import { zBoolean } from '@localess/shared/zod';
import type { LogLevel } from '@nestjs/common';
import { z } from 'zod';

import type { OAuthProviderId } from './oauth-providers.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  // When unset, an embedded Postgres is started inside LOCALESS_DATA_DIR.
  DATABASE_URL: z.string().url().optional(),
  // Defaults to `.data` in the repository root, resolved from this file (src/, dist/ and dist-dev/ are equally
  // deep), so the server, `pnpm dev` and the CLI share one directory whatever the working directory.
  LOCALESS_DATA_DIR: z.string().default(resolve(import.meta.dirname, '../../../../../.data')),
  // Uploaded files and generated renditions. Defaults to `$LOCALESS_DATA_DIR/storage`.
  LOCALESS_STORAGE_DIR: z.string().optional(),
  LOCALESS_EMBEDDED_PG_PORT: z.coerce.number().int().positive().default(5433),
  // Angular build output served by @fastify/static. Set to an empty string to serve the API only.
  // Minimum level printed; `debug`/`verbose` include the embedded Postgres server log.
  LOCALESS_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  // First admin, created on boot only while the database has no users. Prefer `admin:create` for real installs.
  LOCALESS_ADMIN_EMAIL: z.string().email().optional(),
  LOCALESS_ADMIN_PASSWORD: z.string().optional(),
  // Public origin (https://cms.example.com). Used for OAuth callbacks and reset links; defaults to the request's origin.
  LOCALESS_PUBLIC_URL: z.string().url().optional(),
  // Shown on the login page.
  LOCALESS_LOGIN_MESSAGE: z.string().default(''),
  // The label that tells installations apart (for example production and test); unset or blank: no label.
  LOCALESS_INSTANCE_NAME: z.string().max(100).optional(),
  LOCALESS_INSTANCE_COLOR: z.enum(INSTANCE_COLORS).default('primary'),
  // Comma-separated OAuth providers to offer: GOOGLE, MICROSOFT. Each also needs its client id + secret.
  LOCALESS_AUTH_PROVIDERS: z.string().default(''),
  // Google: required `hd` (Workspace domain). Microsoft: the tenant (domain or id) — required for Microsoft.
  LOCALESS_AUTH_CUSTOM_DOMAIN: z.string().default(''),
  // Create an account (with no role) on first OAuth sign-in instead of requiring an existing user.
  LOCALESS_AUTH_AUTO_REGISTER: zBoolean.default(false),
  LOCALESS_GOOGLE_CLIENT_ID: z.string().optional(),
  LOCALESS_GOOGLE_CLIENT_SECRET: z.string().optional(),
  LOCALESS_GOOGLE_ISSUER: z.string().url().default('https://accounts.google.com'),
  LOCALESS_MICROSOFT_CLIENT_ID: z.string().optional(),
  LOCALESS_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  LOCALESS_MICROSOFT_ISSUER: z.string().url().optional(),
  // smtp(s)://user:pass@host:port — enables password reset emails. Without it admins copy reset links instead.
  LOCALESS_SMTP_URL: z.string().optional(),
  LOCALESS_SMTP_FROM: z.string().default('Localess <no-reply@localhost>'),
  // ffmpeg binary for video thumbnails; defaults to `ffmpeg` on the PATH.
  LOCALESS_FFMPEG_PATH: z.string().optional(),
  // Lets webhooks reach loopback/private addresses (local development only; SSRF protection otherwise).
  // Days a webhook delivery log is kept.
  LOCALESS_WEBHOOK_LOG_DAYS: z.coerce.number().int().positive().default(30),
  LOCALESS_WEBHOOK_ALLOW_INTERNAL: zBoolean.default(false),
  // Integrations (Admin → Settings → Integrations). Each one set here is env-locked: the UI shows it read-only.
  // Machine translation: DeepL with DEEPL_API_KEY, Google Cloud Translation with GOOGLE_CLOUD_PROJECT (credentials via
  // GOOGLE_APPLICATION_CREDENTIALS / ADC). LOCALESS_TRANSLATE_PROVIDER=stub echoes inputs (development and tests).
  DEEPL_API_KEY: z.string().optional(),
  // DeepL's API origin (tests, proxies); deepl-node picks Free or Pro from the key when unset.
  LOCALESS_DEEPL_API_URL: z.string().url().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  LOCALESS_GOOGLE_TRANSLATE_LOCATION: z.string().default('global'),
  LOCALESS_TRANSLATE_PROVIDER: z.enum(['stub']).optional(),
  // Which provider is tried first when both are connected; locks the choice in the UI when set.
  LOCALESS_TRANSLATE_PRIMARY: z.enum(['deepl', 'google']).optional(),
  // Unsplash plugin (asset picker).
  UNSPLASH_API_KEY: z.string().optional(),
  LOCALESS_UNSPLASH_API_URL: z.string().url().default('https://api.unsplash.com'),
  // Encrypts integration keys saved in the UI. Unset: generated once into $LOCALESS_DATA_DIR/secret.key.
  LOCALESS_SECRET_KEY: z.string().min(32).optional(),
  // Generated image renditions (resized, re-encoded, thumbnails) kept in storage next to the original, so a repeat is
  // not transformed again: `disk` (default; for installs without a CDN), or `off` (transform on every request and
  // store nothing, for installs behind a CDN or caching proxy).
  LOCALESS_RENDITION_CACHE: z.enum(['disk', 'off']).default('disk'),
  // Largest accepted asset/import upload, in megabytes.
  LOCALESS_UPLOAD_MAX_MB: z.coerce.number().int().positive().default(1024),
  // Run export/import tasks on this instance (turn off on API-only replicas).
  LOCALESS_TASK_WORKER: zBoolean.default(true),
  // Tasks one instance runs at once; imports hold their file's entries in memory, so raise it only with the RAM.
  LOCALESS_TASK_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  // Test-only space templates (large generated data): development and e2e, never production.
  LOCALESS_TEST_TEMPLATES: zBoolean.default(false),
  LOCALESS_STATIC_DIR: z.string().default(resolve(import.meta.dirname, '../../../../web/dist/browser')),
});

export interface AppConfig {
  port: number;
  host: string;
  database: { url: string } | { embedded: { dataDir: string; port: number } };
  dataDir: string;
  storageDir: string;
  ffmpegPath: string | undefined;
  webhookAllowInternal: boolean;
  /** LOCALESS_WEBHOOK_LOG_DAYS: delivery logs older than this are deleted. */
  webhookLogDays: number;
  /**
   * The values of env-locked integrations only (their lock variable is set): `deepl` `{ apiKey }`, `google-translate`
   * `{ projectId, location }`, `unsplash` `{ apiKey }`.
   */
  integrationEnv: Partial<Record<IntegrationId, Record<string, string>>>;
  /** LOCALESS_TRANSLATE_PROVIDER=stub: translation echoes its input, whatever is connected. */
  translateStub: boolean;
  /** LOCALESS_TRANSLATE_PRIMARY; undefined: the UI choice, else DeepL. */
  translatePrimary: TranslatePrimary | undefined;
  unsplashApiUrl: string;
  deeplApiUrl: string | undefined;
  /** LOCALESS_SECRET_KEY; undefined: $LOCALESS_DATA_DIR/secret.key. */
  secretKey: string | undefined;
  uploadMaxBytes: number;
  renditionCache: 'disk' | 'off';
  taskWorker: boolean;
  /** Tasks this instance runs at once (a space never runs two). */
  taskConcurrency: number;
  /** LOCALESS_TEST_TEMPLATES: offer the test-only space templates (development and e2e). */
  testTemplates: boolean;
  staticDir: string | undefined;
  logLevels: LogLevel[];
  firstAdmin: { email: string; password: string } | undefined;
  publicUrl: string | undefined;
  loginMessage: string;
  /** LOCALESS_INSTANCE_NAME / LOCALESS_INSTANCE_COLOR; undefined when the instance is not named. */
  instance: InstanceLabel | undefined;
  auth: {
    customDomain: string;
    autoRegister: boolean;
    providers: Partial<Record<OAuthProviderId, OAuthProviderConfig>>;
    /** Listed in LOCALESS_AUTH_PROVIDERS but not usable, with the reason (logged on boot). */
    misconfigured: string[];
  };
  smtp: { url: string; from: string } | undefined;
}

export type { OAuthProviderId };

export interface OAuthProviderConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

const LOG_LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

function oauthProviders(parsed: z.infer<typeof envSchema>): AppConfig['auth'] {
  const requested = parsed.LOCALESS_AUTH_PROVIDERS.split(',')
    .map(it => it.trim().toUpperCase())
    .filter(Boolean);
  const providers: AppConfig['auth']['providers'] = {};
  const misconfigured: string[] = [];
  const domain = parsed.LOCALESS_AUTH_CUSTOM_DOMAIN.trim();

  if (requested.includes('GOOGLE')) {
    if (parsed.LOCALESS_GOOGLE_CLIENT_ID && parsed.LOCALESS_GOOGLE_CLIENT_SECRET) {
      providers.google = {
        issuer: parsed.LOCALESS_GOOGLE_ISSUER,
        clientId: parsed.LOCALESS_GOOGLE_CLIENT_ID,
        clientSecret: parsed.LOCALESS_GOOGLE_CLIENT_SECRET,
      };
    } else {
      misconfigured.push('GOOGLE needs LOCALESS_GOOGLE_CLIENT_ID and LOCALESS_GOOGLE_CLIENT_SECRET');
    }
  }
  if (requested.includes('MICROSOFT')) {
    // Single-tenant only: multi-tenant ("common") would mean trusting emails no tenant admin vouches for.
    const issuer =
      parsed.LOCALESS_MICROSOFT_ISSUER ?? (domain && domain !== '*' ? `https://login.microsoftonline.com/${domain}/v2.0` : undefined);
    if (!parsed.LOCALESS_MICROSOFT_CLIENT_ID || !parsed.LOCALESS_MICROSOFT_CLIENT_SECRET) {
      misconfigured.push('MICROSOFT needs LOCALESS_MICROSOFT_CLIENT_ID and LOCALESS_MICROSOFT_CLIENT_SECRET');
    } else if (!issuer) {
      misconfigured.push('MICROSOFT needs a tenant in LOCALESS_AUTH_CUSTOM_DOMAIN (multi-tenant sign-in is not supported)');
    } else {
      providers.microsoft = {
        issuer,
        clientId: parsed.LOCALESS_MICROSOFT_CLIENT_ID,
        clientSecret: parsed.LOCALESS_MICROSOFT_CLIENT_SECRET,
      };
    }
  }
  // '*' was the "any domain" value of the Firebase-era setting.
  return { customDomain: domain === '*' ? '' : domain, autoRegister: parsed.LOCALESS_AUTH_AUTO_REGISTER, providers, misconfigured };
}

/** Integrations whose lock variable is set, with all their values from env (never mixed with the UI's). */
function integrationEnv(parsed: z.infer<typeof envSchema>): AppConfig['integrationEnv'] {
  const result: AppConfig['integrationEnv'] = {};
  if (parsed.DEEPL_API_KEY) result.deepl = { apiKey: parsed.DEEPL_API_KEY };
  if (parsed.GOOGLE_CLOUD_PROJECT) {
    result['google-translate'] = { projectId: parsed.GOOGLE_CLOUD_PROJECT, location: parsed.LOCALESS_GOOGLE_TRANSLATE_LOCATION };
  }
  if (parsed.UNSPLASH_API_KEY) result.unsplash = { apiKey: parsed.UNSPLASH_API_KEY };
  return result;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const dataDir = resolve(parsed.LOCALESS_DATA_DIR);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    database: parsed.DATABASE_URL
      ? { url: parsed.DATABASE_URL }
      : { embedded: { dataDir: resolve(dataDir, 'pgdata'), port: parsed.LOCALESS_EMBEDDED_PG_PORT } },
    dataDir,
    ffmpegPath: parsed.LOCALESS_FFMPEG_PATH,
    webhookAllowInternal: parsed.LOCALESS_WEBHOOK_ALLOW_INTERNAL,
    webhookLogDays: parsed.LOCALESS_WEBHOOK_LOG_DAYS,
    integrationEnv: integrationEnv(parsed),
    translateStub: parsed.LOCALESS_TRANSLATE_PROVIDER === 'stub',
    translatePrimary: parsed.LOCALESS_TRANSLATE_PRIMARY === 'google' ? 'google-translate' : parsed.LOCALESS_TRANSLATE_PRIMARY,
    unsplashApiUrl: parsed.LOCALESS_UNSPLASH_API_URL,
    deeplApiUrl: parsed.LOCALESS_DEEPL_API_URL,
    secretKey: parsed.LOCALESS_SECRET_KEY,
    uploadMaxBytes: parsed.LOCALESS_UPLOAD_MAX_MB * 1024 * 1024,
    renditionCache: parsed.LOCALESS_RENDITION_CACHE,
    taskWorker: parsed.LOCALESS_TASK_WORKER,
    taskConcurrency: parsed.LOCALESS_TASK_CONCURRENCY,
    testTemplates: parsed.LOCALESS_TEST_TEMPLATES,
    storageDir: resolve(parsed.LOCALESS_STORAGE_DIR ?? resolve(dataDir, 'storage')),
    staticDir: parsed.LOCALESS_STATIC_DIR ? resolve(parsed.LOCALESS_STATIC_DIR) : undefined,
    firstAdmin:
      parsed.LOCALESS_ADMIN_EMAIL && parsed.LOCALESS_ADMIN_PASSWORD
        ? { email: parsed.LOCALESS_ADMIN_EMAIL, password: parsed.LOCALESS_ADMIN_PASSWORD }
        : undefined,
    publicUrl: parsed.LOCALESS_PUBLIC_URL?.replace(/\/+$/, ''),
    loginMessage: parsed.LOCALESS_LOGIN_MESSAGE,
    instance: parsed.LOCALESS_INSTANCE_NAME?.trim()
      ? { name: parsed.LOCALESS_INSTANCE_NAME.trim(), color: parsed.LOCALESS_INSTANCE_COLOR }
      : undefined,
    auth: oauthProviders(parsed),
    smtp: parsed.LOCALESS_SMTP_URL ? { url: parsed.LOCALESS_SMTP_URL, from: parsed.LOCALESS_SMTP_FROM } : undefined,
    logLevels: LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(parsed.LOCALESS_LOG_LEVEL) + 1),
  };
}
