import { Inject, Injectable } from '@nestjs/common';
import { Content, ContentExport, TaskExportMetadata, WebHookEvent } from '@localess/shared';
import { zContentExportArraySchema } from '@localess/shared/zod';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { withoutNulls } from '../../../infra/database/without-nulls.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { contentToExport } from '../../../shared/transformers/transfer.transformer.js';
import { type ContentEntity, type ContentImportWrite, ContentTransferRepository } from '../repositories/content-transfer.repository.js';
import type { TaskEntity } from '../repositories/tasks.repository.js';
import { isContentChanged } from '../utils/import-diff.js';
import { MAX_JSON_BYTES, taskFileKey, type TaskOutcome } from '../utils/task.utils.js';
import { writeZip } from '../utils/zip.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';

/** CONTENT_EXPORT and CONTENT_IMPORT. */
@Injectable()
export class ContentTransferService {
  constructor(
    private readonly contents: ContentTransferRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly webhooks: WebhookDispatcher,
    private readonly importFile: ImportFileService,
    private readonly log: TaskLogService,
  ) {}

  async export(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    let rows: ContentEntity[] = [];
    if (task.path) {
      const root = await this.contents.findById(spaceId, task.path);
      if (root) {
        rows.push(root);
        await this.log.log(task, 'INFO', `root fullSlug=${root.fullSlug}`);
        if (root.kind === 'FOLDER') rows.push(...(await this.contents.findDescendants(spaceId, root.fullSlug)));
        if (root.parentSlug) {
          // The folders on the way: "a", "a/b", …
          const segments = root.parentSlug.split('/');
          const ancestors = segments.map((_, index) => segments.slice(0, index + 1).join('/'));
          rows.push(...(await this.contents.findByFullSlugs(spaceId, ancestors)));
        }
      }
    } else {
      rows = await this.contents.findAll(spaceId);
    }
    await this.log.log(task, 'INFO', `exporting ${rows.length} contents`);
    const metadata: TaskExportMetadata = { kind: 'CONTENT', ...(task.path ? { path: task.path } : {}) };
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'contents.json', content: JSON.stringify(rows.map(contentToExport)) },
      { name: 'metadata.json', content: JSON.stringify(metadata) },
    ]);
    await this.log.log(task, 'INFO', 'archive saved');
    return { status: 'FINISHED', file: { name: `content-export-${task.id}.llc.zip`, size } };
  }

  async import(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.importFile.open(task, 'CONTENT');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('contents.json', MAX_JSON_BYTES);
    const parse = zContentExportArraySchema.safeParse(raw);
    if (!parse.success) return this.importFile.invalid(task, 'CONTENT', parse.error);
    // Validated, but the raw items are imported (as before): the schema strips document data fields.
    const entries = raw as ContentExport[];
    await this.log.log(task, 'INFO', `valid=${entries.length}`);

    const rows = await this.contents.findAll(spaceId);
    const existing = new Map(rows.map(row => [row.id, withoutNulls(row) as unknown as Content]));
    // Exports from the Firebase era carry Firestore ids: each becomes a new UUID (references in the data are not
    // rewritten; spaces from Firebase are imported with Admin → Spaces → Import from Firebase instead).
    const imported = entries.map(it => ({ ...it, id: isUuid(it.id) ? it.id : newUuid() }));
    const changedDocuments: { id: string; fullSlug: string }[] = [];
    const writes: ContentImportWrite[] = [];
    for (const content of imported) {
      const document = content.kind === 'DOCUMENT' ? content : undefined;
      // Firestore-era exports carry `data` as a JSON string.
      const data = document?.data === undefined ? undefined : typeof document.data === 'string' ? JSON.parse(document.data) : document.data;
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
        writes.push({ op: 'update', id: content.id, columns });
        // As the update trigger did: an edited document is a `content.changed`.
        if (document) changedDocuments.push({ id: content.id, fullSlug: content.fullSlug });
      } else {
        writes.push({ op: 'insert', id: content.id, columns });
      }
    }
    const total = await this.contents.applyImport(spaceId, writes);
    for (const it of changedDocuments) this.webhooks.dispatch(spaceId, WebHookEvent.CONTENT_CHANGED, it);
    await this.log.log(task, 'INFO', `total changes : ${total}`);
    return { status: 'FINISHED' };
  }
}
