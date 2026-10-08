import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
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
} from 'drizzle-orm/pg-core';

/*
 * Ids are `text`, not uuid: rows imported from Firestore keep their document ids, because content,
 * asset and token ids appear in public API URLs and customer code. New rows use the same 20-char
 * alphanumeric format (see `newId()`).
 *
 * Content and asset ids are only unique *within a space*: the export/import tasks upsert by id, so
 * importing space A's export into space B legitimately repeats them. Their keys are (space_id, id).
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
    id: text('id').primaryKey(),
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
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  // 'argon2id' for new passwords, 'firebase-scrypt' for imported ones (re-hashed on next login).
  hashAlgo: text('hash_algo').notNull(),
  // Firebase scrypt salt, only for 'firebase-scrypt'.
  salt: text('salt'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userIdentities = pgTable(
  'user_identities',
  {
    userId: text('user_id')
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
    userId: text('user_id')
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
  userId: text('user_id')
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
    id: text('id').primaryKey(),
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
  text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' });

// ---------------------------------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------------------------------

export const contents = pgTable(
  'contents',
  {
    id: text('id').notNull(),
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
    spaceId: text('space_id').notNull(),
    contentId: text('content_id').notNull(),
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
    id: text('id').notNull(),
    spaceId: spaceId(),
    // 'FOLDER' | 'FILE'
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    // Slash-joined ancestor folder ids, '' for root.
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
    primaryKey({ columns: [t.spaceId, t.id] }),
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
    spaceId: spaceId(),
    id: text('id').notNull(),
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
  t => [primaryKey({ columns: [t.spaceId, t.id] }), index('schemas_type_idx').on(t.spaceId, t.type, t.displayName)],
);

// ---------------------------------------------------------------------------------------------------
// Translations (id is the translation key, unique per space)
// ---------------------------------------------------------------------------------------------------

export const translations = pgTable(
  'translations',
  {
    spaceId: spaceId(),
    id: text('id').notNull(),
    // 'STRING' | 'PLURAL' | 'ARRAY'
    type: text('type').notNull(),
    locales: jsonb('locales').$type<Record<string, string>>().notNull().default({}),
    labels: text('labels').array(),
    description: text('description'),
    updatedBy: jsonb('updated_by').$type<UpdatedBy>(),
    ...timestamps,
  },
  t => [primaryKey({ columns: [t.spaceId, t.id] })],
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
    id: text('id').primaryKey(),
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
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taskId: text('task_id')
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
    // 20-char alphanumeric; the id *is* the secret passed as `?token=` / `X-API-KEY`.
    id: text('id').primaryKey(),
    spaceId: spaceId(),
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
    id: text('id').primaryKey(),
    spaceId: spaceId(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    events: text('events').array().notNull(),
    headers: jsonb('headers').$type<Record<string, string>>(),
    secret: text('secret'),
    ...timestamps,
  },
  t => [index('webhooks_space_idx').on(t.spaceId, t.name), index('webhooks_events_idx').using('gin', t.events)],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    webhookId: text('webhook_id')
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
