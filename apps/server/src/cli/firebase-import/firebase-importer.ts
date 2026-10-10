import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { FirebaseScryptParams } from '../../auth/firebase-scrypt.js';
import { encodeFirebaseHash } from '../../auth/firebase-scrypt.js';
import type { Database } from '../../infra/database/database.module.js';
import {
  assets,
  contentPublished,
  contents,
  Locale,
  schemas,
  settings,
  spaces,
  tokens,
  translationPublished,
  translations,
  UpdatedBy,
  userCredentials,
  users,
  webhookLogs,
  webhooks,
} from '../../infra/database/schema.js';
import { newUuid } from '../../infra/database/id.js';
import { isValidId } from '../../infra/http/v1/id-param.js';
import type { StorageDriver } from '../../infra/storage/storage.driver.js';
import type { FirebaseSource, SourceDocument } from './firebase-source.js';

export interface ImportOptions {
  /** Project password hash parameters; without them, imported users must reset their password. */
  scrypt?: FirebaseScryptParams;
  /** Copy Storage objects (asset originals). Off for a data-only dry run of large projects. */
  files?: boolean;
}

export interface ImportReport {
  users: number;
  passwords: number;
  spaces: number;
  schemas: number;
  contents: number;
  published: number;
  translations: number;
  assets: number;
  filesCopied: number;
  filesSkipped: number;
  tokens: number;
  webhooks: number;
  webhookLogs: number;
  warnings: string[];
}

type Json = Record<string, unknown>;

/** A space's UUID here and its Firestore id, which still names its collections and files in Firebase. */
interface SpaceIds {
  id: string;
  source: string;
}

/** Firestore Timestamp (or its plain `{seconds, nanoseconds}` form) → Date. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number; nanoseconds?: number };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000 + Math.floor((timestamp.nanoseconds ?? 0) / 1e6));
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value);
  return undefined;
}

const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const strings = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((it): it is string => typeof it === 'string') : null;
const obj = <T>(value: unknown): T | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null);
const timestamps = (data: Json) => {
  const createdAt = toDate(data['createdAt']) ?? new Date();
  return { createdAt, updatedAt: toDate(data['updatedAt']) ?? createdAt };
};

/** Firestore stored document data as an object or a JSON string. */
function parseData(value: unknown, warn: (message: string) => void, where: string): Json | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Json;
    } catch {
      warn(`${where}: data is not valid JSON, imported empty`);
      return null;
    }
  }
  return obj<Json>(value);
}

/** Converts nested Timestamps (overview.updatedAt) to ISO strings for JSON columns. */
function plainJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => (toDate(item) && item && typeof item === 'object' ? toDate(item)!.toISOString() : item)),
  ) as T;
}

/**
 * Copies a Firebase-era Localess project into this server: Firestore documents (same ids), Storage
 * files (asset originals, published JSON snapshots) and Auth users (with their password hashes when
 * the project's scrypt parameters are given). Every write is an upsert, so it can run again right
 * before cutover to pick up the delta. Tasks and their files are not imported.
 */
export class FirebaseImporter {
  private readonly logger = new Logger('FirebaseImport');
  private readonly report: ImportReport = {
    users: 0,
    passwords: 0,
    spaces: 0,
    schemas: 0,
    contents: 0,
    published: 0,
    translations: 0,
    assets: 0,
    filesCopied: 0,
    filesSkipped: 0,
    tokens: 0,
    webhooks: 0,
    webhookLogs: 0,
    warnings: [],
  };

  constructor(
    private readonly source: FirebaseSource,
    private readonly db: Database,
    private readonly storage: StorageDriver,
    private readonly options: ImportOptions = {},
  ) {}

  private warn(message: string): void {
    this.report.warnings.push(message);
    this.logger.warn(message);
  }

  async run(): Promise<ImportReport> {
    await this.importSettings();
    await this.importUsers();
    for (const space of await this.source.documents('spaces')) {
      if (!isValidId(space.id)) {
        this.warn(`space '${space.id}': id is not usable in URLs, skipped`);
        continue;
      }
      await this.importSpace(space);
    }
    return this.report;
  }

  private async importSettings(): Promise<void> {
    const doc = (await this.source.documents('configs')).find(it => it.id === 'settings');
    if (!doc) return;
    const ui = obj<{ text?: string; color?: string }>(doc.data['ui']);
    const updatedAt = toDate(doc.data['updatedAt']) ?? new Date();
    await this.db
      .insert(settings)
      .values({ id: 'settings', ui, updatedAt })
      .onConflictDoUpdate({ target: settings.id, set: { ui, updatedAt } });
  }

  private async importUsers(): Promise<void> {
    const profiles = new Map((await this.source.documents('users')).map(it => [it.id, it.data]));
    for await (const auth of this.source.authUsers()) {
      const profile = profiles.get(auth.uid) ?? {};
      const email = auth.email ?? str(profile['email']);
      if (!email) {
        this.warn(`user ${auth.uid}: has no email (phone or anonymous sign-in), skipped`);
        continue;
      }
      // Claims are what Firebase enforced; the users document is the fallback.
      const claims = auth.customClaims ?? {};
      const role = (claims['role'] ?? profile['role'] ?? null) as string | null;
      const values = {
        legacyId: auth.uid,
        email,
        emailVerified: auth.emailVerified,
        displayName: auth.displayName ?? str(profile['displayName']),
        photoUrl: auth.photoURL ?? str(profile['photoURL']),
        disabled: auth.disabled,
        role: role === 'admin' || role === 'custom' ? role : null,
        permissions: role === 'custom' ? (strings(claims['permissions'] ?? profile['permissions']) ?? []) : [],
        lock: role === 'custom' && (claims['lock'] ?? profile['lock']) === true,
        createdAt: auth.creationTime ? new Date(auth.creationTime) : (toDate(profile['createdAt']) ?? new Date()),
        updatedAt: toDate(profile['updatedAt']) ?? new Date(),
      };
      const [clash] = await this.db
        .select({ legacyId: users.legacyId })
        .from(users)
        .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
      if (clash && clash.legacyId !== auth.uid) {
        this.warn(`user ${auth.uid}: ${email} already belongs to another account here, skipped`);
        continue;
      }
      const { legacyId: _l, ...update } = values;
      void _l;
      // Keyed by the Firebase uid: a re-run updates the user it created before, with the same UUID.
      const [{ id: userId }] = await this.db
        .insert(users)
        .values({ id: newUuid(values.createdAt), ...values })
        .onConflictDoUpdate({ target: users.legacyId, set: update })
        .returning({ id: users.id });
      this.report.users++;

      if (auth.passwordHash && auth.passwordSalt) {
        if (!this.options.scrypt) continue;
        const passwordHash = encodeFirebaseHash(this.options.scrypt, auth.passwordHash);
        await this.db
          .insert(userCredentials)
          .values({ userId, hashAlgo: 'firebase-scrypt', salt: auth.passwordSalt, passwordHash })
          // An account that already re-hashed to argon2id here keeps its current password.
          .onConflictDoUpdate({
            target: userCredentials.userId,
            set: { hashAlgo: 'firebase-scrypt', salt: auth.passwordSalt, passwordHash },
            setWhere: eq(userCredentials.hashAlgo, 'firebase-scrypt'),
          });
        this.report.passwords++;
      } else if (auth.providerIds.includes('password')) {
        this.warn(`user ${email}: password hash not readable with these credentials; they must reset their password`);
      }
    }
    if (!this.options.scrypt && this.report.users) {
      this.warn(
        'no password hash parameters given: password users must reset their password (see FIREBASE_SCRYPT_* in apps/server/README.md)',
      );
    }
  }

  private async importSpace(space: SourceDocument): Promise<void> {
    const data = space.data;
    const locales = (Array.isArray(data['locales']) ? data['locales'] : []) as Locale[];
    const localeFallback = obj<Locale>(data['localeFallback']) ?? locales[0] ?? { id: 'en', name: 'English' };
    const values = {
      legacyId: space.id,
      name: str(data['name']) ?? space.id,
      locales: locales.length ? locales : [localeFallback],
      localeFallback,
      environments: Array.isArray(data['environments']) ? (data['environments'] as { name: string; url: string }[]) : null,
      overview: data['overview'] ? plainJson(obj<Json>(data['overview'])) : null,
      progress: obj<{ translations: Record<string, number> }>(data['progress']),
      ...timestamps(data),
    };
    const { legacyId: _l, ...update } = values;
    void _l;
    // Keyed by the Firestore id: a re-run updates the space it created before, with the same UUID.
    const [{ id: spaceId }] = await this.db
      .insert(spaces)
      .values({ id: newUuid(values.createdAt), ...values })
      .onConflictDoUpdate({ target: spaces.legacyId, set: update })
      .returning({ id: spaces.id });
    this.report.spaces++;

    const ids: SpaceIds = { id: spaceId, source: space.id };
    await this.importSchemas(ids);
    await this.importContents(ids, values.locales);
    await this.importTranslations(ids, values.locales);
    await this.importAssets(ids);
    await this.importTokens(ids);
    await this.importWebhooks(ids);

    // Every client re-reads past its cached copies once.
    await this.db
      .update(spaces)
      .set({ contentVersion: sql`${spaces.contentVersion} + 1`, translationVersion: sql`${spaces.translationVersion} + 1` })
      .where(eq(spaces.id, spaceId));
  }

  private async importSchemas({ id: spaceId, source }: SpaceIds): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${source}/schemas`)) {
      const d = doc.data;
      const values = {
        spaceId,
        // The Firestore id is the schema's name, which content and fields refer to.
        name: doc.id,
        type: str(d['type']) ?? 'ROOT',
        displayName: str(d['displayName']),
        description: str(d['description']),
        labels: strings(d['labels']),
        previewField: str(d['previewField']),
        fields: Array.isArray(d['fields']) ? (d['fields'] as unknown[]) : null,
        values: Array.isArray(d['values']) ? (d['values'] as { name: string; value: string }[]) : null,
        ...timestamps(d),
      };
      const { spaceId: _s, name: _n, ...update } = values;
      void _s;
      void _n;
      await this.db
        .insert(schemas)
        .values({ id: newUuid(values.createdAt), ...values })
        .onConflictDoUpdate({ target: [schemas.spaceId, schemas.name], set: update });
      this.report.schemas++;
    }
  }

  private async readJson(path: string): Promise<Json | undefined> {
    if ((await this.source.fileSize(path)) === undefined) return undefined;
    const chunks: Buffer[] = [];
    for await (const chunk of this.source.readFile(path)) chunks.push(Buffer.from(chunk as Buffer));
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json;
    } catch {
      this.warn(`${path}: not valid JSON, skipped`);
      return undefined;
    }
  }

  private async importContents({ id: spaceId, source }: SpaceIds, locales: Locale[]): Promise<void> {
    // Every document gets a UUID (the one an earlier run gave it, found by `legacy_id`). Links and references in content
    // keep the Firestore ids, resolved through `legacy_id` until a later migration rewrites them.
    const earlier = await this.db
      .select({ id: contents.id, legacyId: contents.legacyId })
      .from(contents)
      .where(eq(contents.spaceId, spaceId));
    const known = new Map(earlier.filter(it => it.legacyId).map(it => [it.legacyId as string, it.id]));
    for (const doc of await this.source.documents(`spaces/${source}/contents`)) {
      if (!isValidId(doc.id)) {
        this.warn(`content '${doc.id}' in ${source}: id is not usable in URLs, skipped`);
        continue;
      }
      const d = doc.data;
      const id = known.get(doc.id) ?? newUuid(timestamps(d).createdAt);
      const isDocument = d['kind'] === 'DOCUMENT';
      const slug = str(d['slug']) ?? doc.id;
      const parentSlug = typeof d['parentSlug'] === 'string' ? d['parentSlug'] : '';
      const values = {
        spaceId,
        legacyId: doc.id,
        kind: isDocument ? 'DOCUMENT' : 'FOLDER',
        name: str(d['name']) ?? slug,
        slug,
        parentSlug,
        fullSlug: str(d['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug),
        schema: isDocument ? str(d['schema']) : null,
        data: isDocument ? parseData(d['data'], m => this.warn(m), `content ${source}/${doc.id}`) : null,
        assets: strings(d['assets']),
        links: strings(d['links']),
        references: strings(d['references']),
        publishedAt: isDocument ? (toDate(d['publishedAt']) ?? null) : null,
        updatedBy: obj<UpdatedBy>(d['updatedBy']),
        ...timestamps(d),
      };
      const { spaceId: _s, legacyId: _l, ...update } = values;
      void _s;
      void _l;
      await this.db
        .insert(contents)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: [contents.spaceId, contents.legacyId], set: update });
      this.report.contents++;

      // The published snapshot is copied as served, never rebuilt: it may legitimately differ from the draft.
      if (!values.publishedAt) continue;
      for (const locale of locales) {
        const snapshot = await this.readJson(`spaces/${source}/contents/${doc.id}/${locale.id}.json`);
        if (!snapshot) continue;
        // Copied as served, except the document's own id, which is its UUID now (as in drafts and every response).
        const published = { ...snapshot, id };
        await this.db
          .insert(contentPublished)
          .values({ spaceId, contentId: id, locale: locale.id, data: published, publishedAt: values.publishedAt })
          .onConflictDoUpdate({
            target: [contentPublished.spaceId, contentPublished.contentId, contentPublished.locale],
            set: { data: published, publishedAt: values.publishedAt },
          });
        this.report.published++;
      }
    }
  }

  private async importTranslations({ id: spaceId, source }: SpaceIds, locales: Locale[]): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${source}/translations`)) {
      const d = doc.data;
      const values = {
        spaceId,
        // The Firestore id is the translation key.
        key: doc.id,
        type: str(d['type']) ?? 'STRING',
        locales: obj<Record<string, string>>(d['locales']) ?? {},
        labels: strings(d['labels']),
        description: str(d['description']),
        updatedBy: obj<UpdatedBy>(d['updatedBy']),
        ...timestamps(d),
      };
      const { spaceId: _s, key: _k, ...update } = values;
      void _s;
      void _k;
      await this.db
        .insert(translations)
        .values({ id: newUuid(values.createdAt), ...values })
        .onConflictDoUpdate({ target: [translations.spaceId, translations.key], set: update });
      this.report.translations++;
    }
    for (const locale of locales) {
      const published = await this.readJson(`spaces/${source}/translations/${locale.id}.json`);
      if (!published) continue;
      await this.db
        .insert(translationPublished)
        .values({ spaceId, locale: locale.id, data: published as Record<string, string> })
        .onConflictDoUpdate({
          target: [translationPublished.spaceId, translationPublished.locale],
          set: { data: published as Record<string, string> },
        });
      this.report.published++;
    }
  }

  private async importAssets({ id: spaceId, source }: SpaceIds): Promise<void> {
    const docs = (await this.source.documents(`spaces/${source}/assets`)).filter(doc => {
      if (isValidId(doc.id)) return true;
      this.warn(`asset '${doc.id}' in ${source}: id is not usable as a storage key, skipped`);
      return false;
    });
    // Every asset gets a UUID (the one an earlier run gave it, found by `legacy_id`). Folder ids in `parentPath` are
    // internal to the tree, so they follow; references in content keep the Firestore ids, resolved through `legacy_id`.
    const earlier = await this.db
      .select({ id: assets.id, legacyId: assets.legacyId })
      .from(assets)
      .where(eq(assets.spaceId, spaceId));
    const known = new Map(earlier.filter(it => it.legacyId).map(it => [it.legacyId as string, it.id]));
    const ids = new Map(docs.map(doc => [doc.id, known.get(doc.id) ?? newUuid(timestamps(doc.data).createdAt)]));
    const mapPath = (path: string) => (path ? path.split('/').map(segment => ids.get(segment) ?? segment).join('/') : path);
    for (const doc of docs) {
      const id = ids.get(doc.id) as string;
      const d = doc.data;
      const isFile = d['kind'] === 'FILE';
      let md5: string | null = null;
      if (isFile && this.options.files !== false) {
        const path = `spaces/${spaceId}/assets/${id}/original`;
        md5 = await this.copyFile(`spaces/${source}/assets/${doc.id}/original`, path);
        if (!md5 && (await this.storage.stat(path))) {
          // Copied by an earlier run: hash the local copy only if the row doesn't know it yet.
          const [row] = await this.db
            .select({ md5: assets.md5 })
            .from(assets)
            .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)));
          if (!row?.md5) md5 = await this.localMd5(path);
        }
      }
      const values = {
        spaceId,
        legacyId: doc.id,
        kind: isFile ? 'FILE' : 'FOLDER',
        name: str(d['name']) ?? doc.id,
        parentPath: mapPath(typeof d['parentPath'] === 'string' ? d['parentPath'] : ''),
        extension: isFile ? (typeof d['extension'] === 'string' ? d['extension'] : '') : null,
        type: isFile ? str(d['type']) : null,
        size: isFile && typeof d['size'] === 'number' ? d['size'] : null,
        alt: str(d['alt']),
        source: str(d['source']),
        metadata: obj<Json>(d['metadata']),
        // An upload stuck "in progress" in Firebase stays visible, but no longer blocks anything.
        inProgress: false,
        ...(md5 ? { md5 } : {}),
        ...timestamps(d),
      };
      const { spaceId: _s, legacyId: _l, ...update } = values;
      void _s;
      void _l;
      await this.db
        .insert(assets)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: [assets.spaceId, assets.legacyId], set: update });
      this.report.assets++;
    }
  }

  /**
   * Copies a Firebase Storage object to `path` unless an object of the same size is already there. Returns its
   * base64 md5.
   */
  private async copyFile(sourcePath: string, path: string): Promise<string | null> {
    const size = await this.source.fileSize(sourcePath);
    if (size === undefined) {
      this.warn(`${sourcePath}: missing in Firebase Storage`);
      return null;
    }
    const existing = await this.storage.stat(path);
    if (existing?.size === size) {
      this.report.filesSkipped++;
      // Already copied by an earlier run; its md5 is unchanged, keep the stored row's value.
      return null;
    }
    const stored = await this.storage.put(path, this.source.readFile(sourcePath));
    this.report.filesCopied++;
    return stored.md5;
  }

  private async localMd5(path: string): Promise<string> {
    const hash = createHash('md5');
    for await (const chunk of this.storage.createReadStream(path)) hash.update(chunk as Buffer);
    return hash.digest('base64');
  }

  private async importTokens({ id: spaceId, source }: SpaceIds): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${source}/tokens`)) {
      const d = doc.data;
      const values = {
        // The Firestore id is the secret customers use, so it stays the token value.
        token: doc.id,
        spaceId,
        name: str(d['name']) ?? 'Token',
        version: typeof d['version'] === 'number' ? d['version'] : null,
        permissions: strings(d['permissions']),
        cacheTtl: typeof d['cacheTtl'] === 'number' ? d['cacheTtl'] : null,
        ...timestamps(d),
      };
      const { token: _t, ...update } = values;
      void _t;
      await this.db
        .insert(tokens)
        .values({ id: newUuid(values.createdAt), ...values })
        .onConflictDoUpdate({ target: tokens.token, set: update });
      this.report.tokens++;
    }
  }

  private async importWebhooks({ id: spaceId, source }: SpaceIds): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${source}/webhooks`)) {
      const d = doc.data;
      const values = {
        legacyId: doc.id,
        spaceId,
        name: str(d['name']) ?? 'Webhook',
        url: str(d['url']) ?? '',
        enabled: d['enabled'] !== false,
        events: strings(d['events']) ?? [],
        headers: obj<Record<string, string>>(d['headers']),
        secret: str(d['secret']),
        ...timestamps(d),
      };
      const { legacyId: _l, spaceId: _s, ...update } = values;
      void _l;
      void _s;
      // Keyed by the Firestore id: a re-run updates the webhook it created before, with the same UUID.
      const [{ id: webhookId }] = await this.db
        .insert(webhooks)
        .values({ id: newUuid(values.createdAt), ...values })
        .onConflictDoUpdate({ target: [webhooks.spaceId, webhooks.legacyId], set: update })
        .returning({ id: webhooks.id });
      this.report.webhooks++;

      // Logs get new ids here; re-runs replace the imported history rather than duplicating it.
      await this.db.delete(webhookLogs).where(eq(webhookLogs.webhookId, webhookId));
      for (const log of await this.source.documents(`spaces/${source}/webhooks/${doc.id}/logs`)) {
        const l = log.data;
        const createdAt = toDate(l['createdAt']) ?? new Date();
        await this.db.insert(webhookLogs).values({
          id: newUuid(createdAt),
          webhookId,
          event: str(l['event']) ?? '',
          url: str(l['url']) ?? values.url,
          status: str(l['status']) ?? 'failure',
          statusCode: typeof l['statusCode'] === 'number' ? l['statusCode'] : null,
          statusText: str(l['statusText']),
          errorType: str(l['errorType']),
          errorMessage: str(l['errorMessage']),
          requestSize: typeof l['requestSize'] === 'number' ? l['requestSize'] : 0,
          data: obj<Json>(l['data']) ?? {},
          deliveryId: str(l['deliveryId']) ?? log.id,
          duration: typeof l['duration'] === 'number' ? Math.round(l['duration']) : 0,
          responseBody: str(l['responseBody']),
          responseBodyTruncated: typeof l['responseBodyTruncated'] === 'boolean' ? l['responseBodyTruncated'] : null,
          createdAt,
        });
        this.report.webhookLogs++;
      }
    }
  }
}
