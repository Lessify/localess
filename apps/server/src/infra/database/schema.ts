import { type SQL, sql } from 'drizzle-orm';
import {
  AssetKind,
  ContentKind,
  FIREBASE_IMPORT_STATUSES,
  type FirebaseImportStage,
  type FirebaseImportStageName,
  type SchemaEnumValue,
  type SchemaField,
  SchemaType,
  TaskKind,
  TaskLogLevel,
  TaskStatus,
  TokenPermission,
  TRANSLATION_IMPORT_FORMATS,
  TranslationType,
  USER_ROLES,
  UserPermission,
  WebHookErrorType,
  WebHookEvent,
  WebHookStatus,
} from '@localess/shared';
import { OAUTH_PROVIDERS } from '../config/oauth-providers.js';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  json,
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
 * A space imported from Firebase keeps its Firestore id on its `firebase_imports` row (one import per Firebase space),
 * and its assets in `legacy_id`, so that the space's old asset URLs keep working (docs/roadmap/firebase-space-import.md).
 * The import rewrites every other reference to the new UUIDs.
 *
 * A column with a fixed set of values is `text({ enum })` over the list in @localess/shared (typed in TypeScript) plus a
 * CHECK from the same list (refused by the database): UPPERCASE values, except identifiers of external things (OAuth
 * providers, the password hash algorithm, file formats) and values the public API spells lowercase (translation snapshot
 * versions, as in `?version=draft`). Adding a value is a generated migration.
 *
 * Content and asset keys are (space_id, id): the export/import tasks reuse the ids of an export in another space.
 */

/** The values of a string enum (or a value list), as `text({ enum })` takes them. */
const values = <T extends string>(list: Record<string, T> | readonly T[]): [`${T}`, ...`${T}`[]] =>
  (Array.isArray(list) ? [...list] : Object.values(list)) as [`${T}`, ...`${T}`[]];

/** `'A', 'B'` for a CHECK: the values are constants of the code, never input. */
const quoted = (list: readonly string[]): SQL => sql.raw(list.map(it => `'${it}'`).join(', '));

/** CHECK that `column` is one of `list` (null passes, as in any CHECK). */
const oneOf = (name: string, column: AnyPgColumn, list: readonly string[]) =>
  check(name, sql`${column} in (${quoted(list)})`);

/** CHECK that every element of the array `column` is one of `list`. */
const allOf = (name: string, column: AnyPgColumn, list: readonly string[]) =>
  check(name, sql`${column} <@ array[${quoted(list)}]::text[]`);

export const HASH_ALGORITHMS = ['argon2id'] as const;

/**
 * The standard pair. `updated_at` moves on every drizzle update that does not set it: a write that is not an edit of
 * the row (publishing, cv versions, reordering, the import's reference rewrite) keeps it with `keepUpdatedAt`.
 */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** `set({ ...keepUpdatedAt(table) })`: an update that leaves the row's `updated_at` as it is. */
export const keepUpdatedAt = (table: { updatedAt: AnyPgColumn }) => ({ updatedAt: sql<Date>`${table.updatedAt}` });

export interface Locale {
  id: string;
  name: string;
}

/** A user as a row records them, e.g. who started a Firebase import. */
export interface UserRef {
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
    // null = signed up, no access yet
    role: text('role', { enum: values(USER_ROLES) }),
    permissions: text('permissions', { enum: values(UserPermission) })
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    lock: boolean('lock').notNull().default(false),
    ...timestamps,
  },
  t => [
    uniqueIndex('users_email_idx').on(sql`lower(${t.email})`),
    oneOf('users_role_check', t.role, USER_ROLES),
    allOf('users_permissions_check', t.permissions, values(UserPermission)),
  ],
);

export const userCredentials = pgTable(
  'user_credentials',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),
    hashAlgo: text('hash_algo', { enum: values(HASH_ALGORITHMS) }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [oneOf('user_credentials_hash_algo_check', t.hashAlgo, HASH_ALGORITHMS)],
);

export const userIdentities = pgTable(
  'user_identities',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: values(OAUTH_PROVIDERS) }).notNull(),
    providerSubject: text('provider_subject').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.provider, t.providerSubject] }),
    index('user_identities_user_idx').on(t.userId),
    oneOf('user_identities_provider_check', t.provider, OAUTH_PROVIDERS),
  ],
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
// Locales: every locale a space can use. Database data only, seeded and changed by migrations; the API only reads it.
// ---------------------------------------------------------------------------------------------------

export const locales = pgTable('locales', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

// ---------------------------------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------------------------------

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id').primaryKey(),
    // A space imported from Firebase has its `firebase_imports` row (one at most): its Firestore id and import status.
    name: text('name').notNull(),
    // The default locale: new translations are created in it, content stores its values in the bare field, and a
    // locale with no value falls back to it. That it is one of the space's locales is checked by the API.
    defaultLocaleId: text('default_locale_id')
      .notNull()
      .references(() => locales.id),
    ...timestamps,
  },
);

const spaceId = () =>
  uuid('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' });

/** Visual Editor preview environments of a space, in the order users gave them; the first is the default. Names may repeat. */
export const spaceEnvironments = pgTable(
  'space_environments',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    ...timestamps,
  },
  t => [index('space_environments_space_idx').on(t.spaceId, t.position)],
);

/** The locales of a space, in the order users gave them (`position`). */
export const spaceLocales = pgTable(
  'space_locales',
  {
    spaceId: spaceId(),
    localeId: text('locale_id')
      .notNull()
      .references(() => locales.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.spaceId, t.localeId] })],
);

// ---------------------------------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------------------------------

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').notNull(),
    spaceId: spaceId(),
    kind: text('kind', { enum: values(ContentKind) }).notNull(),
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
    ...timestamps,
  },
  t => [
    oneOf('contents_kind_check', t.kind, values(ContentKind)),
    // Kept per space: the content import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    index('contents_parent_idx').on(t.spaceId, t.parentSlug, t.kind.desc(), t.name),
    index('contents_kind_idx').on(t.spaceId, t.kind, t.name),
    // The path the public API finds a document by: unique per space. text_pattern_ops also serves the subtree LIKE 'a/%'.
    uniqueIndex('contents_full_slug_idx').on(t.spaceId, sql`${t.fullSlug} text_pattern_ops`),
    index('contents_parent_slug_prefix_idx').on(t.spaceId, sql`${t.parentSlug} text_pattern_ops`),
  ],
);

/** The stages the public API serves content and translations in: `?version=…` (draft), or published. */
export const SNAPSHOT_VERSIONS = ['draft', 'published'] as const;
export type SnapshotVersion = (typeof SNAPSHOT_VERSIONS)[number];

/**
 * A document in one locale as the public API serves it (were `spaces/{s}/contents/{id}/{locale}.json` in Storage).
 * Published snapshots are written by a publish, every locale with one `built_at`; a draft is built on the first draft
 * request for its locale after a write of the document dropped it (shared/data-rules/content-snapshots.ts). A snapshot
 * answers to `cv` = `built_at` in epoch milliseconds, so a draft save never moves the published `cv`, a publish never
 * moves the draft one, and a `cv` always names the same data, even after a backup restore.
 */
export const contentSnapshots = pgTable(
  'content_snapshots',
  {
    spaceId: uuid('space_id').notNull(),
    contentId: uuid('content_id').notNull(),
    version: text('version', { enum: SNAPSHOT_VERSIONS }).notNull(),
    locale: text('locale').notNull(),
    // json, not jsonb: jsonb reorders keys (by length), the document keeps its field order. Never queried inside.
    data: json('data').$type<Record<string, unknown>>().notNull(),
    builtAt: timestamp('built_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  t => [
    primaryKey({ columns: [t.spaceId, t.contentId, t.version, t.locale] }),
    foreignKey({ columns: [t.spaceId, t.contentId], foreignColumns: [contents.spaceId, contents.id] }).onDelete('cascade'),
    oneOf('content_snapshots_version_check', t.version, SNAPSHOT_VERSIONS),
  ],
);

/**
 * The `/links` list per stage: `id → ContentMetadata` of every folder and document (draft), or of every folder and the
 * published documents (published). Built on the first request after a content write dropped it; `cv` = `built_at`.
 */
export const contentLinkSnapshots = pgTable(
  'content_link_snapshots',
  {
    spaceId: spaceId(),
    version: text('version', { enum: SNAPSHOT_VERSIONS }).notNull(),
    data: json('data').$type<Record<string, unknown>>().notNull(),
    builtAt: timestamp('built_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  t => [primaryKey({ columns: [t.spaceId, t.version] }), oneOf('content_link_snapshots_version_check', t.version, SNAPSHOT_VERSIONS)],
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
    kind: text('kind', { enum: values(AssetKind) }).notNull(),
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
    ...timestamps,
  },
  t => [
    // Kept per space: the asset import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    uniqueIndex('assets_legacy_idx').on(t.spaceId, t.legacyId),
    index('assets_parent_idx').on(t.spaceId, t.parentPath, t.kind.desc(), t.name),
    index('assets_kind_idx').on(t.spaceId, t.kind, t.name),
    oneOf('assets_kind_check', t.kind, values(AssetKind)),
    index('assets_parent_path_prefix_idx').on(t.spaceId, sql`${t.parentPath} text_pattern_ops`),
  ],
);

/**
 * Stored files waiting to be deleted (shared/data-rules/storage-deletions.ts): a delete queues them in its own
 * transaction and the sweeper removes them, so a crash or a storage failure between the two never leaves files that no
 * row points at. An upload queues its own files due in an hour (a guard) and drops the entry with its row.
 * No foreign keys: the space or asset is already gone when its files are deleted.
 */
export const storageDeletions = pgTable(
  'storage_deletions',
  {
    // `spaces/{s}/assets/{a}/` (one asset) or `spaces/{s}/` (a whole space).
    prefix: text('prefix').primaryKey(),
    spaceId: uuid('space_id').notNull(),
    // Null: the entry is for the whole space.
    assetId: uuid('asset_id'),
    notBefore: timestamp('not_before', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('storage_deletions_due_idx').on(t.notBefore)],
);

// ---------------------------------------------------------------------------------------------------
// Schemas (`name` is the reference, unique per space)
// ---------------------------------------------------------------------------------------------------

export const schemas = pgTable(
  'schemas',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // What every reference uses (contents.schema, `_schema` in content data, fields' `schemas`/`source`, the SDK and
    // Code as Source), so it is unique per space and human readable. An imported schema keeps its Firestore id here.
    name: text('name').notNull(),
    type: text('type', { enum: values(SchemaType) }).notNull(),
    displayName: text('display_name'),
    description: text('description'),
    labels: text('labels').array(),
    previewField: text('preview_field'),
    // ROOT and NODE only.
    fields: jsonb('fields').$type<SchemaField[]>(),
    // ENUM only.
    values: jsonb('values').$type<SchemaEnumValue[]>(),
    ...timestamps,
  },
  t => [
    uniqueIndex('schemas_name_idx').on(t.spaceId, t.name),
    oneOf('schemas_type_check', t.type, values(SchemaType)),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Translations (`key` is the reference, unique per space)
// ---------------------------------------------------------------------------------------------------

export const translations = pgTable(
  'translations',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // The translation key: what the public API, the SDK, the CLI and export files use, so unique per space. An
    // imported translation keeps its Firestore id here.
    key: text('key').notNull(),
    type: text('type', { enum: values(TranslationType) }).notNull(),
    locales: jsonb('locales').$type<Record<string, string>>().notNull().default({}),
    labels: text('labels').array(),
    description: text('description'),
    ...timestamps,
  },
  t => [uniqueIndex('translations_key_idx').on(t.spaceId, t.key), oneOf('translations_type_check', t.type, values(TranslationType))],
);

/**
 * The flat `{key: value}` map the public API serves per stage and locale, gaps filled from the default locale (were
 * `spaces/{s}/translations/{locale}.json` in Storage). Published maps are written by a publish; draft maps are built on
 * the first draft request after a translation or locale change, which drops them (translation-snapshots.ts). A map
 * answers to `cv` = `built_at` in epoch milliseconds, so an edit never moves the published `cv`, a publish never
 * moves the draft one, and a `cv` always names the same data, even after a backup restore.
 */
export const translationSnapshots = pgTable(
  'translation_snapshots',
  {
    spaceId: spaceId(),
    version: text('version', { enum: SNAPSHOT_VERSIONS }).notNull(),
    locale: text('locale').notNull(),
    // json, not jsonb: jsonb reorders keys (by length), the map keeps them in byte order. Never queried inside.
    data: json('data').$type<Record<string, string>>().notNull(),
    builtAt: timestamp('built_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  t => [
    primaryKey({ columns: [t.spaceId, t.version, t.locale] }),
    oneOf('translation_snapshots_version_check', t.version, SNAPSHOT_VERSIONS),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Tasks (also the background job queue)
// ---------------------------------------------------------------------------------------------------

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    kind: text('kind', { enum: values(TaskKind) }).notNull(),
    status: text('status', { enum: values(TaskStatus) }).notNull(),
    message: text('message'),
    trace: text('trace'),
    path: text('path'),
    locale: text('locale'),
    // Translation import format
    type: text('type', { enum: values(TRANSLATION_IMPORT_FORMATS) }),
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
    oneOf('tasks_kind_check', t.kind, values(TaskKind)),
    oneOf('tasks_status_check', t.status, values(TaskStatus)),
    oneOf('tasks_type_check', t.type, TRANSLATION_IMPORT_FORMATS),
  ],
);

export const taskLogs = pgTable(
  'task_logs',
  {
    id: uuid('id').primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    level: text('level', { enum: values(TaskLogLevel) }).notNull(),
    message: text('message').notNull(),
    trace: text('trace'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('task_logs_task_idx').on(t.taskId, t.createdAt), oneOf('task_logs_level_check', t.level, values(TaskLogLevel))],
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
    permissions: text('permissions', { enum: values(TokenPermission) }).array(),
    cacheTtl: integer('cache_ttl'),
    ...timestamps,
  },
  t => [
    index('tokens_space_idx').on(t.spaceId, t.createdAt.desc()),
    index('tokens_permissions_idx').using('gin', t.permissions),
    allOf('tokens_permissions_check', t.permissions, values(TokenPermission)),
  ],
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
    events: text('events', { enum: values(WebHookEvent) }).array().notNull(),
    headers: jsonb('headers').$type<Record<string, string>>(),
    secret: text('secret'),
    ...timestamps,
  },
  t => [
    index('webhooks_space_idx').on(t.spaceId, t.name),
    index('webhooks_events_idx').using('gin', t.events),
    allOf('webhooks_events_check', t.events, values(WebHookEvent)),
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
    status: text('status', { enum: values(WebHookStatus) }).notNull(),
    statusCode: integer('status_code'),
    statusText: text('status_text'),
    errorType: text('error_type', { enum: values(WebHookErrorType) }),
    errorMessage: text('error_message'),
    requestSize: integer('request_size').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    deliveryId: text('delivery_id').notNull(),
    duration: integer('duration').notNull(),
    responseBody: text('response_body'),
    responseBodyTruncated: boolean('response_body_truncated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('webhook_logs_webhook_idx').on(t.webhookId, t.createdAt.desc()),
    oneOf('webhook_logs_status_check', t.status, values(WebHookStatus)),
    oneOf('webhook_logs_error_type_check', t.errorType, values(WebHookErrorType)),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Imports from a Firebase environment (Admin → Spaces → Import from Firebase), one row per run
// ---------------------------------------------------------------------------------------------------

export const firebaseImports = pgTable(
  'firebase_imports',
  {
    id: uuid('id').primaryKey(),
    origin: text('origin').notNull(),
    // Firestore id of the source space: the imported space's old asset URLs keep working with it.
    sourceSpaceId: text('source_space_id').notNull(),
    sourceSpaceName: text('source_space_name').notNull(),
    // The space the run created (one run per space); deleting the space deletes its run. Null until the space exists,
    // and for a run that failed before creating it.
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }),
    status: text('status', { enum: values(FIREBASE_IMPORT_STATUSES) }).notNull(),
    stages: jsonb('stages').$type<FirebaseImportStage[]>().notNull(),
    error: jsonb('error').$type<{ stage: FirebaseImportStageName; message: string }>(),
    startedBy: jsonb('started_by').$type<UserRef>().notNull(),
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
    oneOf('firebase_imports_status_check', t.status, FIREBASE_IMPORT_STATUSES),
    uniqueIndex('firebase_imports_space_idx').on(t.spaceId),
    // One local space per Firebase space: its legacy id resolves to one space.
    uniqueIndex('firebase_imports_source_idx')
      .on(t.sourceSpaceId)
      .where(sql`${t.spaceId} is not null`),
  ],
);
