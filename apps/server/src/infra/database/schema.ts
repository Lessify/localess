import { sql } from 'drizzle-orm';
import type { FirebaseImportStage, FirebaseImportStageName } from '@localess/shared';
import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/*
 * Every id is a UUIDv7 (`newUuid()`, see docs/roadmap/firebase-migration-uuidv7.md). What other rows, customer code,
 * the SDK and Code as Source refer to stays human readable where it always was: a schema's `name`, a translation's
 * `key`, a token's secret `token`.
 *
 * A space imported from Firebase keeps its Firestore id in `legacy_id` (unique: one import per Firebase space), and
 * so do its assets, so that the space's old asset URLs keep working (docs/roadmap/firebase-space-import.md). The
 * import rewrites every other reference to the new UUIDs.
 *
 * Content and asset keys are (space_id, id): the export/import tasks reuse the ids of an export in another space.
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export interface Locale {
  id: string;
  name: string;
}

export interface UpdatedBy {
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------------------------------
// Users & authentication
// ---------------------------------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    disabled: boolean('disabled').notNull().default(false),
    // 'admin' | 'custom' | null (null = signed up, no access yet)
    role: text('role'),
    permissions: text('permissions')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    lock: boolean('lock').notNull().default(false),
    ...timestamps,
  },
  t => [uniqueIndex('users_email_idx').on(sql`lower(${t.email})`)],
);

export const userCredentials = pgTable('user_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  // 'argon2id'
  hashAlgo: text('hash_algo').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userIdentities = pgTable(
  'user_identities',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 'google' | 'microsoft'
    provider: text('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.provider, t.providerSubject] }), index('user_identities_user_idx').on(t.userId)],
);

export const sessions = pgTable(
  'sessions',
  {
    // sha256 of the cookie value; the raw value is never stored.
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------------------------------
// Global settings (was `configs/settings`)
// ---------------------------------------------------------------------------------------------------

export const settings = pgTable('settings', {
  id: text('id').primaryKey().default('settings'),
  ui: jsonb('ui').$type<{ text?: string; color?: string }>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------------------------------

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id').primaryKey(),
    // Firestore id of a space imported from Firebase: one import per Firebase space; its old asset URLs keep working.
    legacyId: text('legacy_id').unique(),
    // 'IMPORTING' while an import from Firebase fills the space, 'FAILED' after a failed one, null otherwise.
    importStatus: text('import_status'),
    name: text('name').notNull(),
    locales: jsonb('locales').$type<Locale[]>().notNull(),
    localeFallback: jsonb('locale_fallback').$type<Locale>().notNull(),
    environments: jsonb('environments').$type<{ name: string; url: string }[]>(),
    overview: jsonb('overview').$type<Record<string, unknown>>(),
    progress: jsonb('progress').$type<{ translations: Record<string, number> }>(),
    // Cache-busters for the public API `cv` redirect (were the GCS generations of `cache.json`).
    contentVersion: bigint('content_version', { mode: 'number' }).notNull().default(1),
    translationVersion: bigint('translation_version', { mode: 'number' }).notNull().default(1),
    ...timestamps,
  },
  t => [index('spaces_name_idx').on(t.name)],
);

const spaceId = () =>
  uuid('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' });

// ---------------------------------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------------------------------

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').notNull(),
    spaceId: spaceId(),
    // 'FOLDER' | 'DOCUMENT'
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    parentSlug: text('parent_slug').notNull().default(''),
    fullSlug: text('full_slug').notNull(),
    schema: text('schema'),
    data: jsonb('data').$type<Record<string, unknown>>(),
    assets: text('assets').array(),
    links: text('links').array(),
    references: text('references').array(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: jsonb('updated_by').$type<UpdatedBy>(),
    ...timestamps,
  },
  t => [
    // Kept per space: the content import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    index('contents_parent_idx').on(t.spaceId, t.parentSlug, t.kind.desc(), t.name),
    index('contents_kind_idx').on(t.spaceId, t.kind, t.name),
    index('contents_full_slug_idx').on(t.spaceId, sql`${t.fullSlug} text_pattern_ops`),
    index('contents_parent_slug_prefix_idx').on(t.spaceId, sql`${t.parentSlug} text_pattern_ops`),
  ],
);

/** Published, locale-extracted documents (were `spaces/{s}/contents/{id}/{locale}.json` in Storage). */
export const contentPublished = pgTable(
  'content_published',
  {
    spaceId: uuid('space_id').notNull(),
    contentId: uuid('content_id').notNull(),
    locale: text('locale').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.spaceId, t.contentId, t.locale] }),
    foreignKey({ columns: [t.spaceId, t.contentId], foreignColumns: [contents.spaceId, contents.id] }).onDelete('cascade'),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------------------------------

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').notNull(),
    spaceId: spaceId(),
    // Firestore id of an imported asset: its old URL redirects (301) to the UUID one.
    legacyId: text('legacy_id'),
    // 'FOLDER' | 'FILE'
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    // Slash-joined ancestor folder ids (UUIDs; the import rewrites Firestore ones), '' for root.
    parentPath: text('parent_path').notNull().default(''),
    extension: text('extension'),
    type: text('type'),
    size: bigint('size', { mode: 'number' }),
    // Base64 md5 of the original file — the same encoding as GCS `md5Hash`, so asset ETags survive the migration.
    md5: text('md5'),
    alt: text('alt'),
    source: text('source'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    inProgress: boolean('in_progress').notNull().default(false),
    ...timestamps,
  },
  t => [
    // Kept per space: the asset import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    uniqueIndex('assets_legacy_idx').on(t.spaceId, t.legacyId),
    index('assets_parent_idx').on(t.spaceId, t.parentPath, t.kind.desc(), t.name),
    index('assets_kind_idx').on(t.spaceId, t.kind, t.name),
    index('assets_parent_path_prefix_idx').on(t.spaceId, sql`${t.parentPath} text_pattern_ops`),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Schemas (id is chosen by the user, unique per space)
// ---------------------------------------------------------------------------------------------------

export const schemas = pgTable(
  'schemas',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // What every reference uses (contents.schema, `_schema` in content data, fields' `schemas`/`source`, the SDK and
    // Code as Source), so it is unique per space and human readable. An imported schema keeps its Firestore id here.
    name: text('name').notNull(),
    // 'ROOT' | 'NODE' | 'ENUM'
    type: text('type').notNull(),
    displayName: text('display_name'),
    description: text('description'),
    labels: text('labels').array(),
    previewField: text('preview_field'),
    fields: jsonb('fields').$type<unknown[]>(),
    values: jsonb('values').$type<{ name: string; value: string }[]>(),
    ...timestamps,
  },
  t => [uniqueIndex('schemas_name_idx').on(t.spaceId, t.name), index('schemas_type_idx').on(t.spaceId, t.type, t.displayName)],
);

// ---------------------------------------------------------------------------------------------------
// Translations (id is the translation key, unique per space)
// ---------------------------------------------------------------------------------------------------

export const translations = pgTable(
  'translations',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // The translation key: what the public API, the SDK, the CLI and export files use, so unique per space. An
    // imported translation keeps its Firestore id here.
    key: text('key').notNull(),
    // 'STRING' | 'PLURAL' | 'ARRAY'
    type: text('type').notNull(),
    locales: jsonb('locales').$type<Record<string, string>>().notNull().default({}),
    labels: text('labels').array(),
    description: text('description'),
    updatedBy: jsonb('updated_by').$type<UpdatedBy>(),
    ...timestamps,
  },
  t => [uniqueIndex('translations_key_idx').on(t.spaceId, t.key)],
);

/** Published flat `{key: value}` maps (were `spaces/{s}/translations/{locale}.json` in Storage). */
export const translationPublished = pgTable(
  'translation_published',
  {
    spaceId: spaceId(),
    locale: text('locale').notNull(),
    data: jsonb('data').$type<Record<string, string>>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.spaceId, t.locale] })],
);

// ---------------------------------------------------------------------------------------------------
// Tasks (also the background job queue)
// ---------------------------------------------------------------------------------------------------

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    kind: text('kind').notNull(),
    // 'INITIATED' | 'IN_PROGRESS' | 'ERROR' | 'FINISHED'
    status: text('status').notNull(),
    message: text('message'),
    trace: text('trace'),
    path: text('path'),
    locale: text('locale'),
    // Translation import format: 'full' | 'flat-json' | 'nested-json'
    type: text('type'),
    file: jsonb('file').$type<{ name: string; size: number }>(),
    lockedBy: text('locked_by'),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    ...timestamps,
  },
  t => [
    index('tasks_space_idx').on(t.spaceId, t.createdAt.desc()),
    index('tasks_queue_idx')
      .on(t.createdAt)
      .where(sql`${t.status} = 'INITIATED'`),
  ],
);

export const taskLogs = pgTable(
  'task_logs',
  {
    id: uuid('id').primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    // 'INFO' | 'WARN' | 'ERROR'
    level: text('level').notNull(),
    message: text('message').notNull(),
    trace: text('trace'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('task_logs_task_idx').on(t.taskId, t.createdAt)],
);

// ---------------------------------------------------------------------------------------------------
// API tokens
// ---------------------------------------------------------------------------------------------------

export const tokens = pgTable(
  'tokens',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // The secret passed as `?token=` / `X-API-KEY`: 20 alphanumerics (`newTokenSecret()`), never the UUID (74 random bits and
    // a readable creation time). An imported token keeps its Firestore id here, the value customers already use.
    token: text('token').notNull().unique(),
    name: text('name').notNull(),
    // null = V1 (implicit permissions), 2 = V2
    version: integer('version'),
    permissions: text('permissions').array(),
    cacheTtl: integer('cache_ttl'),
    ...timestamps,
  },
  t => [index('tokens_space_idx').on(t.spaceId, t.createdAt.desc()), index('tokens_permissions_idx').using('gin', t.permissions)],
);

// ---------------------------------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------------------------------

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    events: text('events').array().notNull(),
    headers: jsonb('headers').$type<Record<string, string>>(),
    secret: text('secret'),
    ...timestamps,
  },
  t => [
    index('webhooks_space_idx').on(t.spaceId, t.name),
    index('webhooks_events_idx').using('gin', t.events),
  ],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: uuid('id').primaryKey(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    url: text('url').notNull(),
    // 'success' | 'failure'
    status: text('status').notNull(),
    statusCode: integer('status_code'),
    statusText: text('status_text'),
    errorType: text('error_type'),
    errorMessage: text('error_message'),
    requestSize: integer('request_size').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    deliveryId: text('delivery_id').notNull(),
    duration: integer('duration').notNull(),
    responseBody: text('response_body'),
    responseBodyTruncated: boolean('response_body_truncated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('webhook_logs_webhook_idx').on(t.webhookId, t.createdAt.desc())],
);

// ---------------------------------------------------------------------------------------------------
// Imports from a Firebase environment (Admin → Spaces → Import from Firebase), one row per run
// ---------------------------------------------------------------------------------------------------

export const firebaseImports = pgTable(
  'firebase_imports',
  {
    id: uuid('id').primaryKey(),
    origin: text('origin').notNull(),
    sourceSpaceId: text('source_space_id').notNull(),
    sourceSpaceName: text('source_space_name').notNull(),
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'set null' }),
    // 'RUNNING' | 'FINISHED' | 'FAILED'
    status: text('status').notNull(),
    stages: jsonb('stages').$type<FirebaseImportStage[]>().notNull(),
    error: jsonb('error').$type<{ stage: FirebaseImportStageName; message: string }>(),
    startedBy: jsonb('started_by').$type<UpdatedBy>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    // Moved on every progress write and every 30 s while running: a RUNNING run whose heartbeat is stale was cut off.
    heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  t => [
    // At most one running import per install, whichever instance started it.
    uniqueIndex('firebase_imports_running_idx')
      .on(t.status)
      .where(sql`${t.status} = 'RUNNING'`),
    index('firebase_imports_started_idx').on(t.startedAt.desc()),
  ],
);
