import {
  AssetKind,
  type ContentData,
  type ContentDocumentStorage,
  ContentKind,
  type ContentMetadata,
  FIREBASE_IMPORT_STATUSES,
  type FirebaseImportStage,
  INTEGRATION_IDS,
  type SchemaEnumValue,
  type SchemaField,
  SchemaType,
  type TaskFile,
  TaskKind,
  TaskLogLevel,
  type TaskParams,
  TaskStatus,
  TokenType,
  USER_ROLES,
  WebhookErrorType,
  WebhookEvent,
  type WebhookPayloadData,
  WebhookStatus,
} from '@localess/shared';
import { type SQL, sql } from 'drizzle-orm';
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
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { OAUTH_PROVIDERS } from '../config/oauth-providers.js';

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
  // Object.values reads a list as well as an enum (Array.isArray would type a readonly list as any[]).
  Object.values(list) as string[] as [`${T}`, ...`${T}`[]];

/** `'A', 'B'` for a CHECK: the values are constants of the code, never input. */
const quoted = (list: readonly string[]): SQL => sql.raw(list.map(it => `'${it}'`).join(', '));

/** CHECK that `column` is one of `list` (null passes, as in any CHECK). */
const oneOf = (name: string, column: AnyPgColumn, list: readonly string[]) => check(name, sql`${column} in (${quoted(list)})`);

/** CHECK that every element of the array `column` is one of `list`. */
const allOf = (name: string, column: AnyPgColumn, list: readonly string[]) => check(name, sql`${column} <@ array[${quoted(list)}]::text[]`);

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
    ...timestamps,
  },
  t => [uniqueIndex('users_email_idx').on(sql`lower(${t.email})`), oneOf('users_role_check', t.role, USER_ROLES)],
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
// Locales: every locale a space can use. Database data only, seeded and changed by migrations; the API only reads it.
// ---------------------------------------------------------------------------------------------------

export const locales = pgTable('locales', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

// ---------------------------------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------------------------------

export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey(),
  // A space imported from Firebase has its `firebase_imports` row (one at most): its Firestore id and import status.
  name: text('name').notNull(),
  // The default locale: new translations are created in it, content stores its values in the bare field, and a
  // locale with no value falls back to it. That it is one of the space's locales is checked by the API.
  defaultLocaleId: text('default_locale_id')
    .notNull()
    .references(() => locales.id),
  ...timestamps,
});

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
    // The folder this item is in; null at the root. Paths (fullSlug, parentSlug) are computed, never stored
    // (shared/queries/content-tree.query.ts).
    parentId: uuid('parent_id'),
    kind: text('kind', { enum: values(ContentKind) }).notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    schema: text('schema'),
    // Blocks of known values, checked on every write (`zContentData`); null until the document is first saved.
    data: jsonb('data').$type<ContentData>(),
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
    // A child always has its parent: deleting a folder deletes everything under it.
    foreignKey({ name: 'contents_parent_fk', columns: [t.spaceId, t.parentId], foreignColumns: [t.spaceId, t.id] }).onDelete('cascade'),
    // A path segment is unique among its siblings; the root is one parent (nulls not distinct).
    unique('contents_slug_idx').on(t.spaceId, t.parentId, t.slug).nullsNotDistinct(),
    // The children list, in its order (folders first, then by name).
    index('contents_parent_idx').on(t.spaceId, t.parentId, t.kind.desc(), t.name),
    index('contents_kind_idx').on(t.spaceId, t.kind, t.name),
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
    data: json('data').$type<ContentDocumentStorage>().notNull(),
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
    data: json('data').$type<Record<string, ContentMetadata>>().notNull(),
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
    // The folder this asset is in; null at the root (shared/queries/asset-tree.query.ts).
    parentId: uuid('parent_id'),
    extension: text('extension'),
    type: text('type'),
    size: bigint('size', { mode: 'number' }),
    // Base64 md5 of the original file — the same encoding as GCS `md5Hash`, so asset ETags survive the migration.
    md5: text('md5'),
    // A file's name in storage (`spaces/{s}/assets/{id}/{original_name}`, shared/utils/asset-files.ts): the upload's
    // file name made safe, set once. Never sent: `name` is what the API shows and renames. Null for folders.
    originalName: text('original_name'),
    alt: text('alt'),
    source: text('source'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  t => [
    // Kept per space: the asset import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    uniqueIndex('assets_legacy_idx').on(t.spaceId, t.legacyId),
    // A child always has its parent: deleting a folder deletes everything under it (their files are queued first).
    foreignKey({ name: 'assets_parent_fk', columns: [t.spaceId, t.parentId], foreignColumns: [t.spaceId, t.id] }).onDelete('cascade'),
    // A folder's children, in their order (folders first, then by name). Names may repeat in a folder.
    index('assets_parent_idx').on(t.spaceId, t.parentId, t.kind.desc(), t.name),
    index('assets_kind_idx').on(t.spaceId, t.kind, t.name),
    oneOf('assets_kind_check', t.kind, values(AssetKind)),
    check('assets_original_name_check', sql`(${t.kind} = 'FILE') = (${t.originalName} is not null)`),
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
  t => [uniqueIndex('schemas_name_idx').on(t.spaceId, t.name), oneOf('schemas_type_check', t.type, values(SchemaType))],
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
    // Plain text per locale.
    locales: jsonb('locales').$type<Record<string, string>>().notNull().default({}),
    labels: text('labels').array(),
    description: text('description'),
    ...timestamps,
  },
  t => [
    uniqueIndex('translations_key_idx').on(t.spaceId, t.key),
    // Byte order: the tree resolves a level by key prefix (`key COLLATE "C" LIKE 'home.%'`), and the public API and the
    // export files list keys in this order.
    index('translations_key_bytes_idx').on(t.spaceId, sql`${t.key} COLLATE "C"`),
  ],
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
    // The kind's input (a translation import's format and locale, translate locale's locales); null for the others.
    params: jsonb('params').$type<TaskParams>(),
    // The upload of an import, or what an export produced; stored at spaces/{space}/tasks/{id}/{name}.
    file: jsonb('file').$type<TaskFile>(),
    // Who started it; kept as null when that user is deleted.
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    // The instance running it, and its heartbeat (refreshed every minute; 5 minutes without one: interrupted).
    lockedBy: text('locked_by'),
    heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }),
    // When an instance picked it up, and when it ended.
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ...timestamps,
  },
  t => [
    index('tasks_space_idx').on(t.spaceId, t.createdAt.desc()),
    index('tasks_queue_idx')
      .on(t.createdAt)
      .where(sql`${t.status} = 'QUEUED'`),
    oneOf('tasks_kind_check', t.kind, values(TaskKind)),
    oneOf('tasks_status_check', t.status, values(TaskStatus)),
    // One running task per space (the worker's claim skips such spaces; this stops two instances racing).
    uniqueIndex('tasks_running_space_idx')
      .on(t.spaceId)
      .where(sql`${t.status} = 'IN_PROGRESS'`),
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
    // `public`/`preview` read the CDN API, `management` the Management API (docs/auth-tokens.md). Never changes: the value's
    // prefix names it.
    type: text('type', { enum: values(TokenType) }).notNull(),
    name: text('name').notNull(),
    // The value (`pub_…`/`prv_…`), so the app can show and copy it; null for `management`, kept only as its hash.
    token: text('token'),
    // sha256 of the value (`hashToken()`): every lookup goes through it.
    tokenHash: text('token_hash').notNull().unique(),
    // The prefix and the last 4 characters, e.g. `mgt_…aB3x`: what the list shows.
    hint: text('hint').notNull(),
    // Seconds the `cv` redirect is cached (0: not cached); null: the default. CDN tokens only.
    cacheTtl: integer('cache_ttl'),
    ...timestamps,
  },
  t => [
    index('tokens_space_idx').on(t.spaceId, t.createdAt.desc()),
    oneOf('tokens_type_check', t.type, values(TokenType)),
    check('tokens_token_check', sql`(${t.type} = 'management') = (${t.token} is null)`),
    check('tokens_cache_ttl_check', sql`${t.type} <> 'management' or ${t.cacheTtl} is null`),
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
    // A new webhook sends nothing until it is enabled (the App API's create enables it; the Firebase import does not).
    enabled: boolean('enabled').notNull().default(false),
    events: text('events', { enum: values(WebhookEvent) })
      .array()
      .notNull(),
    headers: jsonb('headers').$type<Record<string, string>>(),
    secret: text('secret'),
    ...timestamps,
  },
  t => [index('webhooks_space_idx').on(t.spaceId, t.name), allOf('webhooks_events_check', t.events, values(WebhookEvent))],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: uuid('id').primaryKey(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event', { enum: values(WebhookEvent) }).notNull(),
    url: text('url').notNull(),
    status: text('status', { enum: values(WebhookStatus) }).notNull(),
    statusCode: integer('status_code'),
    statusText: text('status_text'),
    errorType: text('error_type', { enum: values(WebhookErrorType) }),
    errorMessage: text('error_message'),
    requestSize: integer('request_size').notNull(),
    // The payload's `data` as it was sent.
    data: jsonb('data').$type<WebhookPayloadData>().notNull(),
    deliveryId: text('delivery_id').notNull(),
    duration: integer('duration').notNull(),
    responseBody: text('response_body'),
    responseBodyTruncated: boolean('response_body_truncated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('webhook_logs_webhook_idx').on(t.webhookId, t.createdAt.desc()),
    oneOf('webhook_logs_event_check', t.event, values(WebhookEvent)),
    oneOf('webhook_logs_status_check', t.status, values(WebhookStatus)),
    oneOf('webhook_logs_error_type_check', t.errorType, values(WebhookErrorType)),
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
    // A failed run's error is on its FAILED stage.
    stages: jsonb('stages').$type<FirebaseImportStage[]>().notNull(),
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
    oneOf('firebase_imports_status_check', t.status, FIREBASE_IMPORT_STATUSES),
    uniqueIndex('firebase_imports_space_idx').on(t.spaceId),
    // One local space per Firebase space: its legacy id resolves to one space.
    uniqueIndex('firebase_imports_source_idx')
      .on(t.sourceSpaceId)
      .where(sql`${t.spaceId} is not null`),
  ],
);

// ---------------------------------------------------------------------------------------------------
// Install-wide settings (Admin → Settings)
// ---------------------------------------------------------------------------------------------------

/** The statuses stored for an integration saved in the UI (`unreadable` is computed when the row can't be opened). */
export const INTEGRATION_STORED_STATUSES = ['verified', 'unverified', 'rejected', 'quota'] as const;

/**
 * An integration connected in the UI (Admin → Settings → Integrations), one row per integration. An env-locked
 * integration ignores its row. `secrets` is every field value as one JSON object, sealed by the SecretBox; `hints` is
 * what may be shown (`••••` + the last 4 characters of a secret, `text` values as they are).
 */
export const integrationSettings = pgTable(
  'integration_settings',
  {
    id: text('id', { enum: INTEGRATION_IDS }).primaryKey(),
    // Switched off keeps the key; Disconnect deletes the row.
    enabled: boolean('enabled').notNull().default(true),
    secrets: text('secrets').notNull(),
    hints: jsonb('hints').$type<Record<string, string>>().notNull(),
    status: text('status', { enum: INTEGRATION_STORED_STATUSES }).notNull(),
    // The last provider error in plain words (`rejected`, `quota`).
    statusMessage: text('status_message'),
    statusAt: timestamp('status_at', { withTimezone: true }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  // No check on `id`: a new integration is a definition in @localess/shared, not a migration.
  t => [oneOf('integration_settings_status_check', t.status, INTEGRATION_STORED_STATUSES)],
);

/** Install-wide settings that aren't secret, by key (`translate.primary`: the provider tried first). */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});
