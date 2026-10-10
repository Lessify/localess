import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type { ZodError } from 'zod';
import {
  Asset,
  AssetExport,
  Content,
  ContentExport,
  SchemaExport,
  TaskExportMetadata,
  Translation,
  TranslationExport,
  WebHookEvent,
} from '@localess/shared';
import {
  zAssetExportArraySchema,
  zContentExportArraySchema,
  zSchemaExportArraySchema,
  zTranslationExportArraySchema,
  zTranslationFlatExportSchema,
} from '@localess/shared/zod';
import { AssetMetadataService } from '../assets/asset-metadata.service.js';
import { folderPath } from '../assets/assets.service.js';
import { bumpVersion } from '../../infra/http/space-access.js';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { assets, contents, schemas, taskLogs, tasks, translations } from '../../infra/database/schema.js';
import { isAssetChanged, isContentChanged, isTranslationChanged } from './import-diff.js';
import { docSchemaToExport, planSchemaPush } from '../schemas/schema.utils.js';
import { schemaFromRow, schemasByName } from '../schemas/schema-row.js';
import { translationFromRow } from '../translations/translation-row.js';
import { applySchemaPushPlan } from '../schemas/schema-push.js';
import { EventsService } from '../../infra/events/events.service.js';
import { isValidId } from '../../infra/http/v1/id-param.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { WebhookDispatcher } from '../webhooks/webhook-dispatcher.service.js';
import { openZip, writeZip, ZipReader } from './zip.js';

export type TaskRow = typeof tasks.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** What a job reports back; written onto the task row by the worker. */
export interface TaskOutcome {
  status: 'FINISHED' | 'ERROR';
  message?: string;
  trace?: string;
  file?: { name: string; size: number };
}

/** JSON entries (assets.json, contents.json, …) may inflate up to this much. */
const MAX_JSON_BYTES = 512 * 1024 * 1024;
const MAX_VALIDATION_ISSUES = 5;
const PROGRESS_INTERVAL = 50;
const KIND_LABEL: Record<TaskExportMetadata['kind'], string> = {
  ASSET: 'Asset',
  CONTENT: 'Content',
  SCHEMA: 'Schema',
  TRANSLATION: 'Translation',
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, m => `\\${m}`);
export const taskFileKey = (task: Pick<TaskRow, 'spaceId' | 'id'>) => `spaces/${task.spaceId}/tasks/${task.id}/original`;
const assetKey = (spaceId: string, id: string) => `spaces/${spaceId}/assets/${id}/original`;

/** Drops null columns so rows look like the Firestore documents the export shapes came from. */
function withoutNulls<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;
}

function formatZodError(error: ZodError): string {
  const total = error.issues.length;
  const shown = error.issues.slice(0, MAX_VALIDATION_ISSUES).map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  const suffix = total > MAX_VALIDATION_ISSUES ? ` (+${total - MAX_VALIDATION_ISSUES} more)` : '';
  return `${total} validation issue${total === 1 ? '' : 's'} - ${shown.join('; ')}${suffix}`;
}

export function assetToExport(row: typeof assets.$inferSelect): AssetExport {
  const asset = withoutNulls(row);
  if (asset.kind === 'FOLDER') return { id: asset.id, kind: 'FOLDER', name: asset.name, parentPath: asset.parentPath } as AssetExport;
  return {
    id: asset.id,
    kind: 'FILE',
    name: asset.name,
    parentPath: asset.parentPath,
    extension: asset.extension,
    type: asset.type,
    size: asset.size,
    alt: asset.alt,
    metadata: asset.metadata,
    source: asset.source,
  } as AssetExport;
}

export function contentToExport(row: typeof contents.$inferSelect): ContentExport {
  const base = { id: row.id, kind: row.kind, name: row.name, slug: row.slug, parentSlug: row.parentSlug, fullSlug: row.fullSlug };
  if (row.kind === 'FOLDER') return base as ContentExport;
  return { ...base, schema: row.schema ?? undefined, data: row.data ?? undefined } as ContentExport;
}

export function translationToExport(row: typeof translations.$inferSelect): TranslationExport {
  const exported: TranslationExport = { id: row.id, type: row.type as TranslationExport['type'], locales: row.locales };
  if (row.labels?.length) exported.labels = row.labels;
  if (row.description) exported.description = row.description;
  return exported;
}

/**
 * The export/import jobs, ported from functions/src/tasks.ts with the same archive layouts and file
 * names. Exports stream the archive straight into storage; imports read only the entries they expect
 * from the stored archive (no extraction to disk), each capped in size.
 */
@Injectable()
export class TaskRunner {
  private readonly logger = new Logger(TaskRunner.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly metadata: AssetMetadataService,
    private readonly events: EventsService,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  /** A step visible in the Tasks UI (`task_logs`) and in the server log. */
  async log(task: TaskRow, level: 'INFO' | 'WARN' | 'ERROR', message: string, trace?: string): Promise<void> {
    const line = `[Task ${task.kind} ${task.id}] ${message}`;
    if (level === 'ERROR') this.logger.error(line);
    else if (level === 'WARN') this.logger.warn(line);
    else this.logger.log(line);
    try {
      await this.db.insert(taskLogs).values({ taskId: task.id, level, message, trace });
      await this.events.publish({ spaceId: task.spaceId, entity: 'task_logs', id: task.id, op: 'created' });
    } catch (error) {
      this.logger.warn(`Could not persist task log: ${error}`);
    }
  }

  async run(task: TaskRow): Promise<TaskOutcome> {
    switch (task.kind) {
      case 'ASSET_EXPORT':
        return this.assetsExport(task);
      case 'ASSET_IMPORT':
        return this.assetsImport(task);
      case 'ASSET_REGEN_METADATA':
        return this.assetsRegenerateMetadata(task);
      case 'CONTENT_EXPORT':
        return this.contentsExport(task);
      case 'CONTENT_IMPORT':
        return this.contentsImport(task);
      case 'SCHEMA_EXPORT':
        return this.schemasExport(task);
      case 'SCHEMA_IMPORT':
        return this.schemasImport(task);
      case 'TRANSLATION_EXPORT':
        return task.locale ? this.translationsExportFlat(task) : this.translationsExport(task);
      case 'TRANSLATION_IMPORT':
        return task.locale ? this.translationsImportFlat(task) : this.translationsImport(task);
      default:
        return { status: 'ERROR', message: `Unknown task kind '${task.kind}'` };
    }
  }

  // ---- shared import plumbing -------------------------------------------------------------------

  /** Opens the archive and checks its metadata; returns an ERROR outcome when it's the wrong kind of file. */
  private async openImport(task: TaskRow, kind: TaskExportMetadata['kind']): Promise<{ zip: ZipReader } | TaskOutcome> {
    await this.log(task, 'INFO', 'reading archive');
    let zip: ZipReader;
    try {
      zip = await openZip(this.storage, taskFileKey(task));
    } catch {
      return { status: 'ERROR', message: `It is not a ${KIND_LABEL[kind]} Export file.` };
    }
    const metadata = await zip.readJson<TaskExportMetadata>('metadata.json', 64 * 1024).catch(() => undefined);
    if (metadata?.kind !== kind) return { status: 'ERROR', message: `It is not a ${KIND_LABEL[kind]} Export file.` };
    return { zip };
  }

  private async invalid(task: TaskRow, kind: TaskExportMetadata['kind'], error: ZodError): Promise<TaskOutcome> {
    await this.log(task, 'WARN', formatZodError(error));
    return { status: 'ERROR', message: `${KIND_LABEL[kind]} data is invalid.`, trace: JSON.stringify(error.issues.slice(0, 100)) };
  }

  // ---- assets ------------------------------------------------------------------------------------

  private async assetsExport(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    let rows: (typeof assets.$inferSelect)[] = [];
    if (task.path) {
      // One asset or folder (by id), its whole subtree, and the folders on the way to it.
      const [root] = await this.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, spaceId), eq(assets.id, task.path)));
      if (root) {
        rows.push(root);
        await this.log(task, 'INFO', `root id=${root.id} name=${root.name}`);
        if (root.kind === 'FOLDER') {
          const path = folderPath(root);
          rows.push(
            ...(await this.db
              .select()
              .from(assets)
              .where(and(eq(assets.spaceId, spaceId), or(eq(assets.parentPath, path), like(assets.parentPath, `${escapeLike(path)}/%`))))),
          );
        }
        if (root.parentPath) {
          rows.push(
            ...(await this.db
              .select()
              .from(assets)
              .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, root.parentPath.split('/'))))),
          );
        }
      }
    } else {
      rows = await this.db.select().from(assets).where(eq(assets.spaceId, spaceId));
    }
    await this.log(task, 'INFO', `exporting ${rows.length} assets`);
    const metadata: TaskExportMetadata = { kind: 'ASSET', ...(task.path ? { path: task.path } : {}) };
    const files = rows.filter(row => row.kind === 'FILE');
    const present: typeof files = [];
    for (const file of files) {
      if (await this.storage.stat(assetKey(spaceId, file.id))) present.push(file);
      else await this.log(task, 'WARN', `file of asset ${file.id} is missing, exported without it`);
    }
    await this.log(task, 'INFO', `archiving ${present.length} files`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'assets.json', content: JSON.stringify(rows.map(assetToExport)) },
      { name: 'metadata.json', content: JSON.stringify(metadata) },
      ...present.map(file => ({ name: `assets/${file.id}`, content: () => this.storage.createReadStream(assetKey(spaceId, file.id)) })),
    ]);
    await this.log(task, 'INFO', 'archive saved');
    return { status: 'FINISHED', file: { name: `asset-export-${task.id}.lla.zip`, size } };
  }

  private async assetsImport(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.openImport(task, 'ASSET');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('assets.json', MAX_JSON_BYTES);
    const parse = zAssetExportArraySchema.safeParse(raw);
    if (!parse.success) return this.invalid(task, 'ASSET', parse.error);
    // Validated, but the raw items are imported (as before): the schemas strip keys they don't list.
    const imported = raw as AssetExport[];
    // Ids end up in storage keys.
    const badId = imported.find(it => !isValidId(it.id));
    if (badId) return { status: 'ERROR', message: 'Asset data is invalid.', trace: `Invalid asset id '${badId.id}'` };
    await this.log(task, 'INFO', `valid=${imported.length}`);

    const existing = new Map(
      (await this.db.select().from(assets).where(eq(assets.spaceId, spaceId))).map(row => [row.id, withoutNulls(row) as unknown as Asset]),
    );
    // Store new files first, so rows never point at missing files; undo them if the rows fail.
    const storedFiles = new Map<string, { size: number; md5: string; metadata?: Record<string, unknown>; alt?: string }>();
    try {
      let streamed = 0;
      for (const asset of imported) {
        if (existing.has(asset.id) || asset.kind !== 'FILE') continue;
        const entry = opened.zip.open(`assets/${asset.id}`, this.config.uploadMaxBytes);
        if (!entry) continue; // as before: a file asset without its bytes is skipped
        const stored = await this.storage.put(assetKey(spaceId, asset.id), entry);
        const extracted = asset.metadata ? undefined : await this.metadata.extract(assetKey(spaceId, asset.id), asset.type, asset.alt);
        storedFiles.set(asset.id, { ...stored, metadata: extracted?.metadata, alt: extracted?.alt });
        if (++streamed % PROGRESS_INTERVAL === 0) await this.log(task, 'INFO', `stored ${streamed} files`);
      }
      const changes = await this.db.transaction(async tx => {
        let total = 0;
        for (const asset of imported) {
          const current = existing.get(asset.id);
          const file = asset.kind === 'FILE' ? asset : undefined;
          if (current) {
            if (!isAssetChanged(current, asset)) continue;
            await tx
              .update(assets)
              .set({
                name: asset.name,
                parentPath: asset.parentPath,
                ...(file
                  ? {
                      extension: file.extension,
                      type: file.type,
                      size: file.size,
                      alt: file.alt || null,
                      source: file.source || null,
                      metadata: (file.metadata as Record<string, unknown>) ?? null,
                    }
                  : {}),
                updatedAt: new Date(),
              })
              .where(and(eq(assets.spaceId, spaceId), eq(assets.id, asset.id)));
          } else if (file) {
            const stored = storedFiles.get(asset.id);
            if (!stored) continue;
            await tx.insert(assets).values({
              id: asset.id,
              spaceId,
              kind: 'FILE',
              name: file.name,
              parentPath: file.parentPath,
              extension: file.extension,
              type: file.type,
              size: stored.size,
              md5: stored.md5,
              alt: file.alt || stored.alt || null,
              source: file.source || null,
              metadata: (file.metadata as Record<string, unknown>) ?? stored.metadata ?? null,
            });
          } else {
            await tx.insert(assets).values({ id: asset.id, spaceId, kind: 'FOLDER', name: asset.name, parentPath: asset.parentPath });
          }
          total++;
        }
        if (total) {
          await bumpVersion(tx, spaceId, 'content');
          await this.events.publish({ spaceId, entity: 'assets', op: 'updated' }, tx);
        }
        return total;
      });
      await this.log(task, 'INFO', `total changes : ${changes}`);
      return { status: 'FINISHED' };
    } catch (error) {
      for (const id of storedFiles.keys()) await this.storage.deletePrefix(`spaces/${spaceId}/assets/${id}/`);
      throw error;
    }
  }

  private async assetsRegenerateMetadata(task: TaskRow): Promise<TaskOutcome> {
    const files = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, task.spaceId), eq(assets.kind, 'FILE')));
    await this.log(task, 'INFO', `found ${files.length} assets to regenerate`);
    let count = 0;
    for (const file of files) {
      const key = assetKey(task.spaceId, file.id);
      if (!(await this.storage.stat(key))) {
        await this.log(task, 'WARN', `asset ${file.id} has no file`);
        continue;
      }
      const extracted = await this.metadata.extract(key, file.type ?? '', file.alt);
      await this.db
        .update(assets)
        .set({
          ...(extracted.metadata ? { metadata: extracted.metadata } : {}),
          ...(extracted.alt ? { alt: extracted.alt } : {}),
          inProgress: false,
          updatedAt: new Date(),
        })
        .where(and(eq(assets.spaceId, task.spaceId), eq(assets.id, file.id)));
      if (++count % PROGRESS_INTERVAL === 0) await this.log(task, 'INFO', `regenerated ${count}/${files.length}`);
    }
    await bumpVersion(this.db, task.spaceId, 'content');
    await this.events.publish({ spaceId: task.spaceId, entity: 'assets', op: 'updated' });
    await this.log(task, 'INFO', `total regenerated : ${count}`);
    return { status: 'FINISHED' };
  }

  // ---- contents ----------------------------------------------------------------------------------

  private async contentsExport(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    let rows: (typeof contents.$inferSelect)[] = [];
    if (task.path) {
      const [root] = await this.db
        .select()
        .from(contents)
        .where(and(eq(contents.spaceId, spaceId), eq(contents.id, task.path)));
      if (root) {
        rows.push(root);
        await this.log(task, 'INFO', `root fullSlug=${root.fullSlug}`);
        if (root.kind === 'FOLDER') {
          rows.push(
            ...(await this.db
              .select()
              .from(contents)
              .where(and(eq(contents.spaceId, spaceId), like(contents.fullSlug, `${escapeLike(root.fullSlug)}/%`)))),
          );
        }
        if (root.parentSlug) {
          // The folders on the way: "a", "a/b", …
          const segments = root.parentSlug.split('/');
          const ancestors = segments.map((_, index) => segments.slice(0, index + 1).join('/'));
          rows.push(
            ...(await this.db
              .select()
              .from(contents)
              .where(and(eq(contents.spaceId, spaceId), inArray(contents.fullSlug, ancestors)))),
          );
        }
      }
    } else {
      rows = await this.db.select().from(contents).where(eq(contents.spaceId, spaceId));
    }
    await this.log(task, 'INFO', `exporting ${rows.length} contents`);
    const metadata: TaskExportMetadata = { kind: 'CONTENT', ...(task.path ? { path: task.path } : {}) };
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'contents.json', content: JSON.stringify(rows.map(contentToExport)) },
      { name: 'metadata.json', content: JSON.stringify(metadata) },
    ]);
    await this.log(task, 'INFO', 'archive saved');
    return { status: 'FINISHED', file: { name: `content-export-${task.id}.llc.zip`, size } };
  }

  private async contentsImport(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.openImport(task, 'CONTENT');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('contents.json', MAX_JSON_BYTES);
    const parse = zContentExportArraySchema.safeParse(raw);
    if (!parse.success) return this.invalid(task, 'CONTENT', parse.error);
    // Validated, but the raw items are imported (as before): the schema strips document data fields.
    const imported = raw as ContentExport[];
    await this.log(task, 'INFO', `valid=${imported.length}`);

    const existing = new Map(
      (await this.db.select().from(contents).where(eq(contents.spaceId, spaceId))).map(row => [
        row.id,
        withoutNulls(row) as unknown as Content,
      ]),
    );
    const changedDocuments: { id: string; fullSlug: string }[] = [];
    const total = await this.db.transaction(async (tx: Transaction) => {
      let changes = 0;
      for (const content of imported) {
        const document = content.kind === 'DOCUMENT' ? content : undefined;
        // Firestore-era exports carry `data` as a JSON string.
        const data =
          document?.data === undefined ? undefined : typeof document.data === 'string' ? JSON.parse(document.data) : document.data;
        const columns = {
          kind: content.kind,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          ...(document ? { schema: document.schema, ...(data !== undefined ? { data } : {}) } : {}),
        };
        const current = existing.get(content.id);
        if (current) {
          if (!isContentChanged(current, data !== undefined ? ({ ...content, data } as ContentExport) : content)) continue;
          await tx
            .update(contents)
            .set({ ...columns, updatedAt: new Date() })
            .where(and(eq(contents.spaceId, spaceId), eq(contents.id, content.id)));
          // As the update trigger did: an edited document is a `content.changed`.
          if (document) changedDocuments.push({ id: content.id, fullSlug: content.fullSlug });
        } else {
          await tx.insert(contents).values({ id: content.id, spaceId, ...columns });
        }
        changes++;
      }
      if (changes) {
        await bumpVersion(tx, spaceId, 'content');
        await this.events.publish({ spaceId, entity: 'contents', op: 'updated' }, tx);
      }
      return changes;
    });
    for (const it of changedDocuments) this.webhooks.dispatch(spaceId, WebHookEvent.CONTENT_CHANGED, it);
    await this.log(task, 'INFO', `total changes : ${total}`);
    return { status: 'FINISHED' };
  }

  // ---- schemas -----------------------------------------------------------------------------------

  private async schemasExport(task: TaskRow): Promise<TaskOutcome> {
    const rows = await this.db
      .select()
      .from(schemas)
      .where(eq(schemas.spaceId, task.spaceId))
      .orderBy(sql`${schemas.name} collate "C"`);
    await this.log(task, 'INFO', `exporting all ${rows.length} schemas`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'schemas.json', content: JSON.stringify(rows.map(row => docSchemaToExport(row.name, schemaFromRow(row)))) },
      { name: 'metadata.json', content: JSON.stringify({ kind: 'SCHEMA' } satisfies TaskExportMetadata) },
    ]);
    return { status: 'FINISHED', file: { name: `schema-export-${task.id}.lls.zip`, size } };
  }

  /** Upsert: schemas absent from the file are kept. */
  private async schemasImport(task: TaskRow): Promise<TaskOutcome> {
    const opened = await this.openImport(task, 'SCHEMA');
    if (!('zip' in opened)) return opened;
    const parse = zSchemaExportArraySchema.safeParse(await opened.zip.readJson('schemas.json', MAX_JSON_BYTES));
    if (!parse.success) return this.invalid(task, 'SCHEMA', parse.error);
    await this.log(task, 'INFO', `valid=${parse.data.length}`);
    const rows = await this.db.select().from(schemas).where(eq(schemas.spaceId, task.spaceId));
    const plan = planSchemaPush(schemasByName(rows), parse.data as SchemaExport[], 'upsert');
    await this.db.transaction(async tx => {
      await applySchemaPushPlan(tx, task.spaceId, plan);
      if (plan.creates.length || plan.updates.length) {
        await bumpVersion(tx, task.spaceId, 'content');
        await this.events.publish({ spaceId: task.spaceId, entity: 'schemas', op: 'updated' }, tx);
      }
    });
    await this.log(task, 'INFO', `total changes : ${plan.creates.length + plan.updates.length}`);
    return { status: 'FINISHED' };
  }

  // ---- translations ------------------------------------------------------------------------------

  private orderedTranslations(spaceId: string) {
    return this.db
      .select()
      .from(translations)
      .where(eq(translations.spaceId, spaceId))
      .orderBy(asc(sql`${translations.id} collate "C"`));
  }

  private async translationsExport(task: TaskRow): Promise<TaskOutcome> {
    const rows = await this.orderedTranslations(task.spaceId);
    await this.log(task, 'INFO', `exporting all ${rows.length} translations`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'translations.json', content: JSON.stringify(rows.map(translationToExport)) },
      { name: 'metadata.json', content: JSON.stringify({ kind: 'TRANSLATION' } satisfies TaskExportMetadata) },
    ]);
    return { status: 'FINISHED', file: { name: `translation-export-${task.id}.llt.zip`, size } };
  }

  /** `{ key: value }` of one locale, keys without a value omitted. */
  private async translationsExportFlat(task: TaskRow): Promise<TaskOutcome> {
    const locale = task.locale as string;
    const rows = await this.orderedTranslations(task.spaceId);
    await this.log(task, 'INFO', `exporting ${rows.length} translations for locale ${locale}`);
    const values: Record<string, string> = {};
    for (const row of rows) if (row.locales[locale]) values[row.id] = row.locales[locale];
    const stored = await this.storage.put(taskFileKey(task), Buffer.from(JSON.stringify(values)));
    return { status: 'FINISHED', file: { name: `translation-${locale}-export-${task.id}.json`, size: stored.size } };
  }

  private async finishTranslationImport(task: TaskRow, changes: number): Promise<TaskOutcome> {
    await this.log(task, 'INFO', `total changes : ${changes}`);
    if (changes) this.webhooks.dispatch(task.spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return { status: 'FINISHED' };
  }

  private async translationsImport(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.openImport(task, 'TRANSLATION');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('translations.json', MAX_JSON_BYTES);
    const parse = zTranslationExportArraySchema.safeParse(raw);
    if (!parse.success) return this.invalid(task, 'TRANSLATION', parse.error);
    const imported = raw as TranslationExport[];
    await this.log(task, 'INFO', `valid=${imported.length}`);
    const existing = new Map<string, Translation>((await this.orderedTranslations(spaceId)).map(row => [row.id, translationFromRow(row)]));
    const changes = await this.db.transaction(async tx => {
      let total = 0;
      for (const translation of imported) {
        const columns = {
          type: translation.type,
          locales: translation.locales,
          description: translation.description || null,
          labels: translation.labels?.length ? translation.labels : null,
        };
        const current = existing.get(translation.id);
        if (current) {
          if (!isTranslationChanged(current, translation)) continue;
          await tx
            .update(translations)
            .set({ ...columns, updatedAt: new Date() })
            .where(and(eq(translations.spaceId, spaceId), eq(translations.id, translation.id)));
        } else {
          await tx.insert(translations).values({ spaceId, id: translation.id, ...columns });
        }
        total++;
      }
      if (total) {
        await bumpVersion(tx, spaceId, 'translation');
        await this.events.publish({ spaceId, entity: 'translations', op: 'updated' }, tx);
      }
      return total;
    });
    return this.finishTranslationImport(task, changes);
  }

  /** A flat `{ key: value }` JSON file into one locale: new keys are created as STRING. */
  private async translationsImportFlat(task: TaskRow): Promise<TaskOutcome> {
    const { spaceId } = task;
    const locale = task.locale as string;
    await this.log(task, 'INFO', 'reading file');
    let raw: unknown;
    try {
      const stat = await this.storage.stat(taskFileKey(task));
      if (!stat || stat.size > MAX_JSON_BYTES) throw new Error('missing or too large');
      raw = JSON.parse((await this.storage.read(taskFileKey(task))).toString('utf8'));
    } catch {
      return { status: 'ERROR', message: 'It is not a Translation Export file.' };
    }
    const parse = zTranslationFlatExportSchema.safeParse(raw);
    if (!parse.success) return this.invalid(task, 'TRANSLATION', parse.error);
    const values = parse.data;
    await this.log(task, 'INFO', `valid=${Object.keys(values).length}`);
    const existing = new Map((await this.orderedTranslations(spaceId)).map(row => [row.id, row]));
    const changes = await this.db.transaction(async tx => {
      let total = 0;
      for (const [id, value] of Object.entries(values)) {
        const current = existing.get(id);
        if (current) {
          if (current.locales[locale] === value) continue;
          await tx
            .update(translations)
            .set({
              locales: sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(value)}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(and(eq(translations.spaceId, spaceId), eq(translations.id, id)));
        } else {
          await tx.insert(translations).values({ spaceId, id, type: 'STRING', locales: { [locale]: value } });
        }
        total++;
      }
      if (total) {
        await bumpVersion(tx, spaceId, 'translation');
        await this.events.publish({ spaceId, entity: 'translations', op: 'updated' }, tx);
      }
      return total;
    });
    return this.finishTranslationImport(task, changes);
  }
}
