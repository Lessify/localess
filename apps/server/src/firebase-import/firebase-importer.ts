import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { FirebaseScryptParams } from '../auth/firebase-scrypt.js';
import { encodeFirebaseHash } from '../auth/firebase-scrypt.js';
import type { Database } from '../database/database.module.js';
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
} from '../database/schema.js';
import { isValidId } from '../public-api/lib/id-param.js';
import type { StorageDriver } from '../storage/storage.driver.js';
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
        id: auth.uid,
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
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
      if (clash && clash.id !== auth.uid) {
        this.warn(`user ${auth.uid}: ${email} already belongs to another account here, skipped`);
        continue;
      }
      const { id: _id, ...update } = values;
      void _id;
      await this.db.insert(users).values(values).onConflictDoUpdate({ target: users.id, set: update });
      this.report.users++;

      if (auth.passwordHash && auth.passwordSalt) {
        if (!this.options.scrypt) continue;
        const passwordHash = encodeFirebaseHash(this.options.scrypt, auth.passwordHash);
        await this.db
          .insert(userCredentials)
          .values({ userId: auth.uid, hashAlgo: 'firebase-scrypt', salt: auth.passwordSalt, passwordHash })
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
    const spaceId = space.id;
    const data = space.data;
    const locales = (Array.isArray(data['locales']) ? data['locales'] : []) as Locale[];
    const localeFallback = obj<Locale>(data['localeFallback']) ?? locales[0] ?? { id: 'en', name: 'English' };
    const values = {
      id: spaceId,
      name: str(data['name']) ?? spaceId,
      locales: locales.length ? locales : [localeFallback],
      localeFallback,
      environments: Array.isArray(data['environments']) ? (data['environments'] as { name: string; url: string }[]) : null,
      overview: data['overview'] ? plainJson(obj<Json>(data['overview'])) : null,
      progress: obj<{ translations: Record<string, number> }>(data['progress']),
      ...timestamps(data),
    };
    const { id: _id, ...update } = values;
    void _id;
    await this.db.insert(spaces).values(values).onConflictDoUpdate({ target: spaces.id, set: update });
    this.report.spaces++;

    await this.importSchemas(spaceId);
    await this.importContents(spaceId, values.locales);
    await this.importTranslations(spaceId, values.locales);
    await this.importAssets(spaceId);
    await this.importTokens(spaceId);
    await this.importWebhooks(spaceId);

    // Every client re-reads past its cached copies once.
    await this.db
      .update(spaces)
      .set({ contentVersion: sql`${spaces.contentVersion} + 1`, translationVersion: sql`${spaces.translationVersion} + 1` })
      .where(eq(spaces.id, spaceId));
  }

  private async importSchemas(spaceId: string): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/schemas`)) {
      const d = doc.data;
      const values = {
        spaceId,
        id: doc.id,
        type: str(d['type']) ?? 'ROOT',
        displayName: str(d['displayName']),
        description: str(d['description']),
        labels: strings(d['labels']),
        previewField: str(d['previewField']),
        fields: Array.isArray(d['fields']) ? (d['fields'] as unknown[]) : null,
        values: Array.isArray(d['values']) ? (d['values'] as { name: string; value: string }[]) : null,
        ...timestamps(d),
      };
      const { spaceId: _s, id: _i, ...update } = values;
      void _s;
      void _i;
      await this.db
        .insert(schemas)
        .values(values)
        .onConflictDoUpdate({ target: [schemas.spaceId, schemas.id], set: update });
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

  private async importContents(spaceId: string, locales: Locale[]): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/contents`)) {
      if (!isValidId(doc.id)) {
        this.warn(`content '${doc.id}' in ${spaceId}: id is not usable in URLs, skipped`);
        continue;
      }
      const d = doc.data;
      const isDocument = d['kind'] === 'DOCUMENT';
      const slug = str(d['slug']) ?? doc.id;
      const parentSlug = typeof d['parentSlug'] === 'string' ? d['parentSlug'] : '';
      const values = {
        spaceId,
        id: doc.id,
        kind: isDocument ? 'DOCUMENT' : 'FOLDER',
        name: str(d['name']) ?? slug,
        slug,
        parentSlug,
        fullSlug: str(d['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug),
        schema: isDocument ? str(d['schema']) : null,
        data: isDocument ? parseData(d['data'], m => this.warn(m), `content ${spaceId}/${doc.id}`) : null,
        assets: strings(d['assets']),
        links: strings(d['links']),
        references: strings(d['references']),
        publishedAt: isDocument ? (toDate(d['publishedAt']) ?? null) : null,
        updatedBy: obj<UpdatedBy>(d['updatedBy']),
        ...timestamps(d),
      };
      const { spaceId: _s, id: _i, ...update } = values;
      void _s;
      void _i;
      await this.db
        .insert(contents)
        .values(values)
        .onConflictDoUpdate({ target: [contents.spaceId, contents.id], set: update });
      this.report.contents++;

      // The published snapshot is copied as served, never rebuilt: it may legitimately differ from the draft.
      if (!values.publishedAt) continue;
      for (const locale of locales) {
        const published = await this.readJson(`spaces/${spaceId}/contents/${doc.id}/${locale.id}.json`);
        if (!published) continue;
        await this.db
          .insert(contentPublished)
          .values({ spaceId, contentId: doc.id, locale: locale.id, data: published, publishedAt: values.publishedAt })
          .onConflictDoUpdate({
            target: [contentPublished.spaceId, contentPublished.contentId, contentPublished.locale],
            set: { data: published, publishedAt: values.publishedAt },
          });
        this.report.published++;
      }
    }
  }

  private async importTranslations(spaceId: string, locales: Locale[]): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/translations`)) {
      const d = doc.data;
      const values = {
        spaceId,
        id: doc.id,
        type: str(d['type']) ?? 'STRING',
        locales: obj<Record<string, string>>(d['locales']) ?? {},
        labels: strings(d['labels']),
        description: str(d['description']),
        updatedBy: obj<UpdatedBy>(d['updatedBy']),
        ...timestamps(d),
      };
      const { spaceId: _s, id: _i, ...update } = values;
      void _s;
      void _i;
      await this.db
        .insert(translations)
        .values(values)
        .onConflictDoUpdate({ target: [translations.spaceId, translations.id], set: update });
      this.report.translations++;
    }
    for (const locale of locales) {
      const published = await this.readJson(`spaces/${spaceId}/translations/${locale.id}.json`);
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

  private async importAssets(spaceId: string): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/assets`)) {
      if (!isValidId(doc.id)) {
        this.warn(`asset '${doc.id}' in ${spaceId}: id is not usable as a storage key, skipped`);
        continue;
      }
      const d = doc.data;
      const isFile = d['kind'] === 'FILE';
      let md5: string | null = null;
      if (isFile && this.options.files !== false) {
        const path = `spaces/${spaceId}/assets/${doc.id}/original`;
        md5 = await this.copyFile(path);
        if (!md5 && (await this.storage.stat(path))) {
          // Copied by an earlier run: hash the local copy only if the row doesn't know it yet.
          const [row] = await this.db
            .select({ md5: assets.md5 })
            .from(assets)
            .where(and(eq(assets.spaceId, spaceId), eq(assets.id, doc.id)));
          if (!row?.md5) md5 = await this.localMd5(path);
        }
      }
      const values = {
        spaceId,
        id: doc.id,
        kind: isFile ? 'FILE' : 'FOLDER',
        name: str(d['name']) ?? doc.id,
        parentPath: typeof d['parentPath'] === 'string' ? d['parentPath'] : '',
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
      const { spaceId: _s, id: _i, ...update } = values;
      void _s;
      void _i;
      await this.db
        .insert(assets)
        .values(values)
        .onConflictDoUpdate({ target: [assets.spaceId, assets.id], set: update });
      this.report.assets++;
    }
  }

  /** Copies a Storage object unless an object of the same size is already here. Returns its base64 md5. */
  private async copyFile(path: string): Promise<string | null> {
    const size = await this.source.fileSize(path);
    if (size === undefined) {
      this.warn(`${path}: missing in Firebase Storage`);
      return null;
    }
    const existing = await this.storage.stat(path);
    if (existing?.size === size) {
      this.report.filesSkipped++;
      // Already copied by an earlier run; its md5 is unchanged, keep the stored row's value.
      return null;
    }
    const stored = await this.storage.put(path, this.source.readFile(path));
    this.report.filesCopied++;
    return stored.md5;
  }

  private async localMd5(path: string): Promise<string> {
    const hash = createHash('md5');
    for await (const chunk of this.storage.createReadStream(path)) hash.update(chunk as Buffer);
    return hash.digest('base64');
  }

  private async importTokens(spaceId: string): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/tokens`)) {
      const d = doc.data;
      const values = {
        id: doc.id,
        spaceId,
        name: str(d['name']) ?? 'Token',
        version: typeof d['version'] === 'number' ? d['version'] : null,
        permissions: strings(d['permissions']),
        cacheTtl: typeof d['cacheTtl'] === 'number' ? d['cacheTtl'] : null,
        ...timestamps(d),
      };
      const { id: _i, ...update } = values;
      void _i;
      await this.db.insert(tokens).values(values).onConflictDoUpdate({ target: tokens.id, set: update });
      this.report.tokens++;
    }
  }

  private async importWebhooks(spaceId: string): Promise<void> {
    for (const doc of await this.source.documents(`spaces/${spaceId}/webhooks`)) {
      const d = doc.data;
      const values = {
        id: doc.id,
        spaceId,
        name: str(d['name']) ?? 'Webhook',
        url: str(d['url']) ?? '',
        enabled: d['enabled'] !== false,
        events: strings(d['events']) ?? [],
        headers: obj<Record<string, string>>(d['headers']),
        secret: str(d['secret']),
        ...timestamps(d),
      };
      const { id: _i, ...update } = values;
      void _i;
      await this.db.insert(webhooks).values(values).onConflictDoUpdate({ target: webhooks.id, set: update });
      this.report.webhooks++;

      // Logs have generated ids here; re-runs replace the imported history rather than duplicating it.
      await this.db.delete(webhookLogs).where(eq(webhookLogs.webhookId, doc.id));
      for (const log of await this.source.documents(`spaces/${spaceId}/webhooks/${doc.id}/logs`)) {
        const l = log.data;
        await this.db.insert(webhookLogs).values({
          webhookId: doc.id,
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
          createdAt: toDate(l['createdAt']) ?? new Date(),
        });
        this.report.webhookLogs++;
      }
    }
  }
}
