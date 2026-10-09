import { resolve } from 'node:path';
import type { LogLevel } from '@nestjs/common';
import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  // When unset, an embedded Postgres is started inside LOCALESS_DATA_DIR.
  DATABASE_URL: z.string().url().optional(),
  LOCALESS_DATA_DIR: z.string().default('.data'),
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
  // Comma-separated OAuth providers to offer: GOOGLE, MICROSOFT. Each also needs its client id + secret.
  LOCALESS_AUTH_PROVIDERS: z.string().default(''),
  // Google: required `hd` (Workspace domain). Microsoft: the tenant (domain or id) — required for Microsoft.
  LOCALESS_AUTH_CUSTOM_DOMAIN: z.string().default(''),
  // Create an account (with no role) on first OAuth sign-in instead of requiring an existing user.
  LOCALESS_AUTH_AUTO_REGISTER: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
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
  LOCALESS_WEBHOOK_ALLOW_INTERNAL: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  // Machine translation. DeepL when DEEPL_API_KEY is set, else Google Cloud Translation when
  // GOOGLE_CLOUD_PROJECT is set (credentials via GOOGLE_APPLICATION_CREDENTIALS / ADC).
  // LOCALESS_TRANSLATE_PROVIDER=stub echoes inputs (development and tests).
  DEEPL_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  LOCALESS_GOOGLE_TRANSLATE_LOCATION: z.string().default('global'),
  LOCALESS_TRANSLATE_PROVIDER: z.enum(['stub']).optional(),
  // Unsplash plugin (asset picker); disabled without a key.
  UNSPLASH_API_KEY: z.string().optional(),
  LOCALESS_UNSPLASH_API_URL: z.string().url().default('https://api.unsplash.com'),
  // Largest accepted asset/import upload, in megabytes.
  LOCALESS_UPLOAD_MAX_MB: z.coerce.number().int().positive().default(1024),
  // Run export/import tasks on this instance (turn off on API-only replicas).
  LOCALESS_TASK_WORKER: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
  LOCALESS_STATIC_DIR: z.string().default(resolve(import.meta.dirname, '../../../web/dist/browser')),
});

export interface AppConfig {
  port: number;
  host: string;
  database: { url: string } | { embedded: { dataDir: string; port: number } };
  dataDir: string;
  storageDir: string;
  ffmpegPath: string | undefined;
  webhookAllowInternal: boolean;
  translate:
    | { provider: 'deepl'; apiKey: string }
    | { provider: 'google'; projectId: string; location: string }
    | { provider: 'stub' }
    | { provider: 'none' };
  unsplash: { apiKey: string; apiUrl: string } | undefined;
  uploadMaxBytes: number;
  taskWorker: boolean;
  staticDir: string | undefined;
  logLevels: LogLevel[];
  firstAdmin: { email: string; password: string } | undefined;
  publicUrl: string | undefined;
  loginMessage: string;
  auth: {
    customDomain: string;
    autoRegister: boolean;
    providers: Partial<Record<OAuthProviderId, OAuthProviderConfig>>;
    /** Listed in LOCALESS_AUTH_PROVIDERS but not usable, with the reason (logged on boot). */
    misconfigured: string[];
  };
  smtp: { url: string; from: string } | undefined;
}

export type OAuthProviderId = 'google' | 'microsoft';

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
    translate: parsed.LOCALESS_TRANSLATE_PROVIDER
      ? { provider: 'stub' }
      : parsed.DEEPL_API_KEY
        ? { provider: 'deepl', apiKey: parsed.DEEPL_API_KEY }
        : parsed.GOOGLE_CLOUD_PROJECT
          ? { provider: 'google', projectId: parsed.GOOGLE_CLOUD_PROJECT, location: parsed.LOCALESS_GOOGLE_TRANSLATE_LOCATION }
          : { provider: 'none' },
    uploadMaxBytes: parsed.LOCALESS_UPLOAD_MAX_MB * 1024 * 1024,
    taskWorker: parsed.LOCALESS_TASK_WORKER,
    unsplash: parsed.UNSPLASH_API_KEY ? { apiKey: parsed.UNSPLASH_API_KEY, apiUrl: parsed.LOCALESS_UNSPLASH_API_URL } : undefined,
    storageDir: resolve(parsed.LOCALESS_STORAGE_DIR ?? resolve(dataDir, 'storage')),
    staticDir: parsed.LOCALESS_STATIC_DIR ? resolve(parsed.LOCALESS_STATIC_DIR) : undefined,
    firstAdmin:
      parsed.LOCALESS_ADMIN_EMAIL && parsed.LOCALESS_ADMIN_PASSWORD
        ? { email: parsed.LOCALESS_ADMIN_EMAIL, password: parsed.LOCALESS_ADMIN_PASSWORD }
        : undefined,
    publicUrl: parsed.LOCALESS_PUBLIC_URL?.replace(/\/+$/, ''),
    loginMessage: parsed.LOCALESS_LOGIN_MESSAGE,
    auth: oauthProviders(parsed),
    smtp: parsed.LOCALESS_SMTP_URL ? { url: parsed.LOCALESS_SMTP_URL, from: parsed.LOCALESS_SMTP_FROM } : undefined,
    logLevels: LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(parsed.LOCALESS_LOG_LEVEL) + 1),
  };
}
