import { isTranslationKey, TaskExportMetadata, TranslationExport, WebhookEvent } from '@localess/shared';
import { zTranslationFile, zTranslationFlatFile } from '@localess/shared/zod';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { translationToExport } from '../../../shared/transformers/transfer.transformer.js';
import { translationsByKey } from '../../../shared/transformers/translation.transformer.js';
import {
  type TranslationImportWrite,
  type TranslationLocaleWrite,
  TranslationTransferRepository,
} from '../repositories/translation-transfer.repository.js';
import { isTranslationChanged } from '../utils/import-diff.js';
import { MAX_JSON_BYTES, taskFileKey, type TaskOutcome } from '../utils/task.utils.js';
import { writeZip } from '../utils/zip.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';

/** TRANSLATION_EXPORT and TRANSLATION_IMPORT: the whole archive, or one locale as a flat JSON file (`task.locale`). */
@Injectable()
export class TranslationTransferService {
  constructor(
    private readonly translationTransferRepository: TranslationTransferRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly importFileService: ImportFileService,
    private readonly taskLogService: TaskLogService,
  ) {}

  async export(task: TaskEntity): Promise<TaskOutcome> {
    const rows = await this.translationTransferRepository.findAll(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `exporting all ${rows.length} translations`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'translations.json', content: JSON.stringify(rows.map(translationToExport)) },
      { name: 'metadata.json', content: JSON.stringify({ kind: 'TRANSLATION' } satisfies TaskExportMetadata) },
    ]);
    return { status: 'FINISHED', file: { name: `translation-export-${task.id}.llt.zip`, size } };
  }

  /** `{ key: value }` of one locale, keys without a value omitted. */
  async exportFlat(task: TaskEntity): Promise<TaskOutcome> {
    const locale = task.locale as string;
    const rows = await this.translationTransferRepository.findAll(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `exporting ${rows.length} translations for locale ${locale}`);
    const values: Record<string, string> = {};
    for (const row of rows) if (row.locales[locale]) values[row.key] = row.locales[locale];
    const stored = await this.storage.put(taskFileKey(task), Buffer.from(JSON.stringify(values)));
    return { status: 'FINISHED', file: { name: `translation-${locale}-export-${task.id}.json`, size: stored.size } };
  }

  async import(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.importFileService.open(task, 'TRANSLATION');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('translations.json', MAX_JSON_BYTES);
    const parse = zTranslationFile.safeParse(raw);
    if (!parse.success) return this.importFileService.invalid(task, 'TRANSLATION', parse.error);
    // Values are written only for the space's locales; the others are skipped and logged.
    const spaceLocales = new Set(await this.spaceLocaleIds(spaceId));
    const skipped = new Map<string, number>();
    const imported = (raw as TranslationExport[]).map(translation => {
      const locales: Record<string, string> = {};
      for (const [locale, value] of Object.entries(translation.locales)) {
        if (spaceLocales.has(locale)) locales[locale] = value;
        else skipped.set(locale, (skipped.get(locale) ?? 0) + 1);
      }
      return { ...translation, locales };
    });
    await this.taskLogService.log(task, 'INFO', `valid=${imported.length}`);
    if (skipped.size) {
      const count = [...skipped.values()].reduce((sum, it) => sum + it, 0);
      await this.taskLogService.log(
        task,
        'WARN',
        `skipped ${count} values of locales not in the space: ${[...skipped.keys()].sort().join(', ')}`,
      );
    }
    const existing = translationsByKey(await this.translationTransferRepository.findAll(spaceId));
    const writes: TranslationImportWrite[] = [];
    for (const translation of imported) {
      const columns = {
        locales: translation.locales,
        description: translation.description || null,
        labels: translation.labels?.length ? translation.labels : null,
      };
      const current = existing.get(translation.id);
      if (current) {
        if (!isTranslationChanged(current, translation)) continue;
        writes.push({ op: 'update', key: translation.id, columns });
      } else {
        writes.push({ op: 'insert', key: translation.id, columns });
      }
    }
    const refused = await this.refuseInvalidKeys(task, writes);
    if (refused) return refused;
    return this.imported(task, await this.translationTransferRepository.applyImport(spaceId, writes));
  }

  /** A flat `{ key: value }` JSON file into one locale: new keys are created as STRING. */
  async importFlat(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const locale = task.locale as string;
    await this.taskLogService.log(task, 'INFO', 'reading file');
    let raw: unknown;
    try {
      const stat = await this.storage.stat(taskFileKey(task));
      if (!stat || stat.size > MAX_JSON_BYTES) throw new Error('missing or too large');
      raw = JSON.parse((await this.storage.read(taskFileKey(task))).toString('utf8'));
    } catch {
      return { status: 'ERROR', message: 'It is not a Translation Export file.' };
    }
    const parse = zTranslationFlatFile.safeParse(raw);
    if (!parse.success) return this.importFileService.invalid(task, 'TRANSLATION', parse.error);
    const values = parse.data;
    if (!(await this.spaceLocaleIds(spaceId)).includes(locale)) {
      return { status: 'ERROR', message: `Locale ${locale} is not in the space locales.` };
    }
    await this.taskLogService.log(task, 'INFO', `valid=${Object.keys(values).length}`);
    const existing = new Map((await this.translationTransferRepository.findAll(spaceId)).map(row => [row.key, row]));
    const writes: TranslationLocaleWrite[] = [];
    for (const [key, value] of Object.entries(values)) {
      const current = existing.get(key);
      if (current) {
        if (current.locales[locale] === value) continue;
        writes.push({ op: 'update', key, value });
      } else {
        writes.push({ op: 'insert', key, value });
      }
    }
    const refused = await this.refuseInvalidKeys(task, writes);
    if (refused) return refused;
    return this.imported(task, await this.translationTransferRepository.applyLocaleImport(spaceId, locale, writes));
  }

  /** An ERROR outcome when the import would create keys outside the key rule (existing keys are updated whatever their form). */
  private async refuseInvalidKeys(task: TaskEntity, writes: { op: 'insert' | 'update'; key: string }[]): Promise<TaskOutcome | undefined> {
    const invalid = writes.filter(it => it.op === 'insert' && !isTranslationKey(it.key)).map(it => it.key);
    if (!invalid.length) return undefined;
    const message = `Invalid translation keys: ${invalid.slice(0, 20).join(', ')}${invalid.length > 20 ? `, … (${invalid.length})` : ''}`;
    await this.taskLogService.log(task, 'ERROR', message);
    return { status: 'ERROR', message };
  }

  /** `translation.changed` after commit, when the import wrote anything. */
  private async imported(task: TaskEntity, changes: number): Promise<TaskOutcome> {
    await this.taskLogService.log(task, 'INFO', `total changes : ${changes}`);
    if (changes) this.webhookDispatcher.dispatch(task.spaceId, WebhookEvent.TRANSLATION_CHANGED);
    return { status: 'FINISHED' };
  }

  /** The ids of the space's locales; a 404 when the space is gone. */
  private async spaceLocaleIds(spaceId: string): Promise<string[]> {
    const space = await this.spaceLookupRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space.spaceLocales.map(it => it.localeId);
  }
}
