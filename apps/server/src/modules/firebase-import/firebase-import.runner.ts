import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { FirebaseImportStage, FirebaseImportStageName, Locale } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { newUuid } from '../../infra/database/id.js';
import { assets, contents, firebaseImports, schemas, spaces, tokens, translations, webhooks } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../assets/asset-metadata.service.js';
import { FirebaseClient, type FirebaseDoc } from './firebase-client.js';
import { obj, parseData, str, strings, timestamps } from './firebase-docs.js';
import { ReferenceMaps, rewriteData, rewriteIds } from './rewrite-references.js';
import { nextVersion } from '../../infra/http/space-access.js';

const MAX_WARNINGS = 50;
/** Rows of the space read at once by the content migration. */
const PAGE_SIZE = 500;
/** How often a running import proves it is alive (see `FirebaseImportService.failInterrupted`). */
export const HEARTBEAT_MS = 30_000;

/** The run is no longer RUNNING (failed by recovery elsewhere): stop without writing. */
class RunAbandoned extends Error {}

class StageFailure extends Error {
  constructor(
    readonly stage: FirebaseImportStageName,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Executes one import run (Admin → Spaces → Import from Firebase): the stages of the spec in order, each recorded on
 * the `firebase_imports` row as it progresses. The space is created first and flagged `IMPORTING`; a failure leaves it
 * flagged `FAILED` for inspection and records the failing stage.
 */
@Injectable()
export class FirebaseImportRunner {
  private readonly logger = new Logger(FirebaseImportRunner.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
    private readonly events: EventsService,
  ) {}

  async execute(runId: string, client: FirebaseClient, sourceSpaceId: string): Promise<void> {
    const [run] = await this.db.select().from(firebaseImports).where(eq(firebaseImports.id, runId));
    if (!run || run.status !== 'RUNNING') return;
    const stages: FirebaseImportStage[] = run.stages.map(it => ({ ...it }));
    let current: FirebaseImportStageName = 'space';
    let spaceId: string | undefined;
    const running = and(eq(firebaseImports.id, runId), eq(firebaseImports.status, 'RUNNING'));
    // Every write is conditional on the run still being RUNNING, so a run failed elsewhere cannot come back.
    const save = async (extra: Partial<typeof firebaseImports.$inferInsert> = {}) => {
      const updated = await this.db
        .update(firebaseImports)
        .set({ stages, heartbeatAt: new Date(), ...extra })
        .where(running)
        .returning({ id: firebaseImports.id });
      if (!updated.length) throw new RunAbandoned();
    };
    const heartbeat = setInterval(() => {
      void this.db
        .update(firebaseImports)
        .set({ heartbeatAt: new Date() })
        .where(running)
        .catch(error => this.logger.warn(`Import ${runId} heartbeat failed: ${(error as Error).message}`));
    }, HEARTBEAT_MS);
    const stage = (name: FirebaseImportStageName) => stages.find(it => it.stage === name)!;
    const begin = async (name: FirebaseImportStageName) => {
      current = name;
      stage(name).status = 'RUNNING';
      await save();
    };
    const done = async (name: FirebaseImportStageName, count: number) => {
      Object.assign(stage(name), { status: 'DONE', count });
      await save();
    };
    const warn = (name: FirebaseImportStageName, message: string) => {
      const it = stage(name);
      it.warningCount = (it.warningCount ?? 0) + 1;
      if ((it.warnings ??= []).length < MAX_WARNINGS) it.warnings.push(message);
    };

    try {
      // 1 space
      await begin('space');
      const source = await client.space(sourceSpaceId);
      spaceId = newUuid(timestamps(source).createdAt);
      const locales = (Array.isArray(source['locales']) ? source['locales'] : []) as Locale[];
      const fallback = obj<Locale>(source['localeFallback']) ?? locales[0] ?? { id: 'en', name: 'English' };
      await this.db.insert(spaces).values({
        id: spaceId,
        legacyId: sourceSpaceId,
        name: str(source['name']) ?? sourceSpaceId,
        locales: locales.length ? locales : [fallback],
        localeFallback: fallback,
        importStatus: 'IMPORTING',
        ...timestamps(source),
      });
      await save({ spaceId });
      await done('space', 1);
      const sid = spaceId;

      // 2 locales, 3 environments (set with the space; counted separately for the progress view)
      await begin('locales');
      await done('locales', locales.length);
      await begin('environments');
      const environments = Array.isArray(source['environments']) ? (source['environments'] as { name: string; url: string }[]) : [];
      if (environments.length) await this.db.update(spaces).set({ environments }).where(eq(spaces.id, sid));
      await done('environments', environments.length);

      // 4 tokens
      await begin('tokens');
      const tokenDocs = await client.list(sourceSpaceId, 'tokens');
      for (const doc of tokenDocs) {
        const [taken] = await this.db
          .select({ space: spaces.name })
          .from(tokens)
          .innerJoin(spaces, eq(spaces.id, tokens.spaceId))
          .where(eq(tokens.token, doc.id));
        if (taken) throw new StageFailure('tokens', `Token '${str(doc['name']) ?? doc.id}' already exists in space '${taken.space}'`);
        await this.db.insert(tokens).values({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: sid,
          token: doc.id,
          name: str(doc['name']) ?? 'Token',
          version: typeof doc['version'] === 'number' ? doc['version'] : null,
          permissions: strings(doc['permissions']),
          cacheTtl: typeof doc['cacheTtl'] === 'number' ? doc['cacheTtl'] : null,
          ...timestamps(doc),
        });
      }
      await done('tokens', tokenDocs.length);

      // 5 webhooks, disabled: both environments may run in parallel
      await begin('webhooks');
      const hookDocs = await client.list(sourceSpaceId, 'webhooks');
      for (const doc of hookDocs) {
        await this.db.insert(webhooks).values({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: sid,
          name: str(doc['name']) ?? 'Webhook',
          url: str(doc['url']) ?? '',
          enabled: false,
          events: strings(doc['events']) ?? [],
          headers: obj<Record<string, string>>(doc['headers']),
          secret: str(doc['secret']),
          ...timestamps(doc),
        });
      }
      await done('webhooks', hookDocs.length);

      // 6 translations
      await begin('translations');
      let translationCount = 0;
      for await (const page of client.pages(sourceSpaceId, 'translations')) {
        await this.db.insert(translations).values(
          page.map(doc => ({
            id: newUuid(timestamps(doc).createdAt),
            spaceId: sid,
            key: doc.id,
            type: str(doc['type']) ?? 'STRING',
            locales: obj<Record<string, string>>(doc['locales']) ?? {},
            labels: strings(doc['labels']),
            description: str(doc['description']),
            ...timestamps(doc),
          })),
        );
        translationCount += page.length;
        stage('translations').count = translationCount;
        await save();
      }
      await done('translations', translationCount);

      // 7 schemas
      await begin('schemas');
      const schemaDocs = await client.list(sourceSpaceId, 'schemas');
      if (schemaDocs.length) {
        await this.db.insert(schemas).values(
          schemaDocs.map(doc => ({
            id: newUuid(timestamps(doc).createdAt),
            spaceId: sid,
            name: doc.id,
            type: str(doc['type']) ?? 'ROOT',
            displayName: str(doc['displayName']),
            description: str(doc['description']),
            labels: strings(doc['labels']),
            previewField: str(doc['previewField']),
            fields: Array.isArray(doc['fields']) ? (doc['fields'] as unknown[]) : null,
            values: Array.isArray(doc['values']) ? (doc['values'] as { name: string; value: string }[]) : null,
            ...timestamps(doc),
          })),
        );
      }
      await done('schemas', schemaDocs.length);

      // 8 assets: ids first, so folder paths can be mapped; then rows and files
      await begin('assets');
      const assetDocs: FirebaseDoc[] = [];
      for await (const page of client.pages(sourceSpaceId, 'assets')) assetDocs.push(...page);
      const assetIds = new Map(assetDocs.map(doc => [doc.id, newUuid(timestamps(doc).createdAt)]));
      const files = assetDocs.filter(doc => doc['kind'] === 'FILE');
      stage('assets').total = files.length;
      let assetCount = 0;
      for (const doc of assetDocs) {
        const id = assetIds.get(doc.id)!;
        const parent = typeof doc['parentPath'] === 'string' ? doc['parentPath'] : '';
        const parentPath = parent
          .split('/')
          .filter(Boolean)
          .map(segment => {
            const mapped = assetIds.get(segment);
            if (!mapped) warn('assets', `${str(doc['name']) ?? doc.id}: keeps an unmapped parent folder '${segment}'`);
            return mapped ?? segment;
          })
          .join('/');
        const isFile = doc['kind'] === 'FILE';
        let stored: { size: number; md5: string } | undefined;
        let extracted: { metadata?: Record<string, unknown>; alt?: string } | undefined;
        if (isFile) {
          const stream = await client.assetFile(sourceSpaceId, doc.id).catch(error => {
            throw new StageFailure('assets', `Downloading asset '${str(doc['name']) ?? doc.id}' failed: ${(error as Error).message}`);
          });
          if (stream) {
            const key = `spaces/${sid}/assets/${id}/original`;
            stored = await this.storage.put(key, stream);
            if (!obj(doc['metadata'])) extracted = await this.metadata.extract(key, str(doc['type']) ?? 'application/octet-stream', str(doc['alt']));
          } else {
            warn('assets', `${str(doc['name']) ?? doc.id}: no file in Firebase, the asset is kept without it`);
          }
        }
        await this.db.insert(assets).values({
          id,
          spaceId: sid,
          legacyId: doc.id,
          kind: isFile ? 'FILE' : 'FOLDER',
          name: str(doc['name']) ?? doc.id,
          parentPath,
          extension: isFile ? (typeof doc['extension'] === 'string' ? doc['extension'] : '') : null,
          type: isFile ? str(doc['type']) : null,
          size: isFile ? (stored?.size ?? (typeof doc['size'] === 'number' ? doc['size'] : null)) : null,
          md5: stored?.md5 ?? null,
          alt: str(doc['alt']) ?? extracted?.alt ?? null,
          source: str(doc['source']),
          metadata: obj<Record<string, unknown>>(doc['metadata']) ?? extracted?.metadata ?? null,
          inProgress: false,
          ...timestamps(doc),
        });
        assetCount++;
        if (assetCount % 50 === 0) {
          stage('assets').count = assetCount;
          await save();
        }
      }
      await done('assets', assetCount);

      // 9 contents, as stored, page by page; references are rewritten in the next stage. Only the id map is kept.
      await begin('contents');
      const contentIds = new Map<string, string>();
      let contentCount = 0;
      for await (const page of client.pages(sourceSpaceId, 'contents')) {
        const rows = page.map(doc => {
          const isDocument = doc['kind'] === 'DOCUMENT';
          const slug = str(doc['slug']) ?? doc.id;
          const parentSlug = typeof doc['parentSlug'] === 'string' ? doc['parentSlug'] : '';
          const fullSlug = str(doc['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug);
          const parsed = isDocument ? parseData(doc['data']) : { data: null, invalid: false };
          if (parsed.invalid) warn('contents', `${fullSlug}: data is not valid JSON, imported empty`);
          const id = newUuid(timestamps(doc).createdAt);
          contentIds.set(doc.id, id);
          return {
            id,
            spaceId: sid,
            kind: isDocument ? 'DOCUMENT' : 'FOLDER',
            name: str(doc['name']) ?? slug,
            slug,
            parentSlug,
            fullSlug,
            schema: isDocument ? str(doc['schema']) : null,
            data: parsed.data,
            assets: strings(doc['assets']),
            links: strings(doc['links']),
            references: strings(doc['references']),
            publishedAt: null,
            updatedBy: obj<{ name: string; email: string }>(doc['updatedBy']),
            ...timestamps(doc),
          };
        });
        await this.db.insert(contents).values(rows);
        contentCount += rows.length;
        stage('contents').count = contentCount;
        await save();
      }
      await done('contents', contentCount);

      // 10 content migration, in pages of the space's rows
      await begin('contentMigration');
      const maps: ReferenceMaps = { assets: assetIds, contents: contentIds };
      let rewritten = 0;
      let after: string | undefined;
      for (;;) {
        const rows = await this.db
          .select({ id: contents.id, fullSlug: contents.fullSlug, data: contents.data, assets: contents.assets, links: contents.links, references: contents.references })
          .from(contents)
          .where(after ? and(eq(contents.spaceId, sid), gt(contents.id, after)) : eq(contents.spaceId, sid))
          .orderBy(asc(contents.id))
          .limit(PAGE_SIZE);
        if (!rows.length) break;
        for (const row of rows) {
          const data = rewriteData(row.data, maps);
          const assetRefs = rewriteIds(row.assets, maps.assets, 'asset');
          const links = rewriteIds(row.links, maps.contents, 'content');
          const references = rewriteIds(row.references, maps.contents, 'content');
          const missing = new Set([...data.missing, ...assetRefs.missing, ...links.missing, ...references.missing].map(it => `${it.kind} '${it.id}'`));
          for (const it of missing) warn('contentMigration', `${row.fullSlug}: no ${it}`);
          if (data.changed || assetRefs.changed || links.changed || references.changed) {
            await this.db
              .update(contents)
              .set({ data: data.value as Record<string, unknown> | null, assets: assetRefs.value, links: links.value, references: references.value })
              .where(and(eq(contents.spaceId, sid), eq(contents.id, row.id)));
            rewritten++;
          }
        }
        after = rows[rows.length - 1].id;
        stage('contentMigration').count = rewritten;
        await save();
      }
      await done('contentMigration', rewritten);

      await this.db
        .update(spaces)
        .set({ importStatus: null, contentVersion: nextVersion(spaces.contentVersion), translationVersion: nextVersion(spaces.translationVersion) })
        .where(eq(spaces.id, sid));
      await save({ status: 'FINISHED', finishedAt: new Date() });
      await this.events.publish({ spaceId: null, entity: 'spaces', id: sid, op: 'created' });
    } catch (error) {
      if (error instanceof RunAbandoned) {
        this.logger.warn(`Import ${runId} was failed elsewhere while running; stopped`);
        return;
      }
      const failedStage = error instanceof StageFailure ? error.stage : current;
      const message = (error as Error).message;
      this.logger.warn(`Import ${runId} failed at ${failedStage}: ${message}`);
      Object.assign(stage(failedStage), { status: 'FAILED', error: message });
      await save({ status: 'FAILED', error: { stage: failedStage, message }, finishedAt: new Date() }).catch(() => undefined);
      if (spaceId) await this.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, spaceId));
    } finally {
      clearInterval(heartbeat);
    }
  }
}
