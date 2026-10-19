import { Inject, Injectable } from '@nestjs/common';
import { isTranslationKey, TaskExportMetadata, TranslationExport, WebHookEvent } from '@localess/shared';
import { zTranslationExportArraySchema, zTranslationFlatExportSchema } from '@localess/shared/zod';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { translationToExport } from '../../../shared/transformers/transfer.transformer.js';
import { translationsByKey } from '../../../shared/transformers/translation.transformer.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import type { TaskEntity } from '../repositories/task.repository.js';
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
    private readonly translations: TranslationTransferRepository,
    private readonly spaces: SpaceRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly webhooks: WebhookDispatcher,
    private readonly importFile: ImportFileService,
    private readonly log: TaskLogService,
  ) {}

  async export(task: TaskEntity): Promise<TaskOutcome> {
    const rows = await this.translations.findAll(task.spaceId);
    await this.log.log(task, 'INFO', `exporting all ${rows.length} translations`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'translations.json', content: JSON.stringify(rows.map(translationToExport)) },
      { name: 'metadata.json', content: JSON.stringify({ kind: 'TRANSLATION' } satisfies TaskExportMetadata) },
    ]);
    return { status: 'FINISHED', file: { name: `translation-export-${task.id}.llt.zip`, size } };
  }

  /** `{ key: value }` of one locale, keys without a value omitted. */
  async exportFlat(task: TaskEntity): Promise<TaskOutcome> {
    const locale = task.locale as string;
    const rows = await this.translations.findAll(task.spaceId);
    await this.log.log(task, 'INFO', `exporting ${rows.length} translations for locale ${locale}`);
    const values: Record<string, string> = {};
    for (const row of rows) if (row.locales[locale]) values[row.key] = row.locales[locale];
    const stored = await this.storage.put(taskFileKey(task), Buffer.from(JSON.stringify(values)));
    return { status: 'FINISHED', file: { name: `translation-${locale}-export-${task.id}.json`, size: stored.size } };
  }

  async import(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.importFile.open(task, 'TRANSLATION');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('translations.json', MAX_JSON_BYTES);
    const parse = zTranslationExportArraySchema.safeParse(raw);
    if (!parse.success) return this.importFile.invalid(task, 'TRANSLATION', parse.error);
    // Values are written only for the space's locales; the others are skipped and logged.
    const spaceLocales = new Set((await this.spaces.require(spaceId)).locales.map(it => it.id));
    const skipped = new Map<string, number>();
    const imported = (raw as TranslationExport[]).map(translation => {
      const locales: Record<string, string> = {};
      for (const [locale, value] of Object.entries(translation.locales)) {
        if (spaceLocales.has(locale)) locales[locale] = value;
        else skipped.set(locale, (skipped.get(locale) ?? 0) + 1);
      }
      return { ...translation, locales };
    });
    await this.log.log(task, 'INFO', `valid=${imported.length}`);
    if (skipped.size) {
      const count = [...skipped.values()].reduce((sum, it) => sum + it, 0);
      await this.log.log(task, 'WARN', `skipped ${count} values of locales not in the space: ${[...skipped.keys()].sort().join(', ')}`);
    }
    const existing = translationsByKey(await this.translations.findAll(spaceId));
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
    return this.imported(task, await this.translations.applyImport(spaceId, writes));
  }

  /** A flat `{ key: value }` JSON file into one locale: new keys are created as STRING. */
  async importFlat(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const locale = task.locale as string;
    await this.log.log(task, 'INFO', 'reading file');
    let raw: unknown;
    try {
      const stat = await this.storage.stat(taskFileKey(task));
      if (!stat || stat.size > MAX_JSON_BYTES) throw new Error('missing or too large');
      raw = JSON.parse((await this.storage.read(taskFileKey(task))).toString('utf8'));
    } catch {
      return { status: 'ERROR', message: 'It is not a Translation Export file.' };
    }
    const parse = zTranslationFlatExportSchema.safeParse(raw);
    if (!parse.success) return this.importFile.invalid(task, 'TRANSLATION', parse.error);
    const values = parse.data;
    if (!(await this.spaces.require(spaceId)).locales.some(it => it.id === locale)) {
      return { status: 'ERROR', message: `Locale ${locale} is not in the space locales.` };
    }
    await this.log.log(task, 'INFO', `valid=${Object.keys(values).length}`);
    const existing = new Map((await this.translations.findAll(spaceId)).map(row => [row.key, row]));
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
    return this.imported(task, await this.translations.applyLocaleImport(spaceId, locale, writes));
  }

  /** An ERROR outcome when the import would create keys outside the key rule (existing keys are updated whatever their form). */
  private async refuseInvalidKeys(task: TaskEntity, writes: { op: 'insert' | 'update'; key: string }[]): Promise<TaskOutcome | undefined> {
    const invalid = writes.filter(it => it.op === 'insert' && !isTranslationKey(it.key)).map(it => it.key);
    if (!invalid.length) return undefined;
    const message = `Invalid translation keys: ${invalid.slice(0, 20).join(', ')}${invalid.length > 20 ? `, … (${invalid.length})` : ''}`;
    await this.log.log(task, 'ERROR', message);
    return { status: 'ERROR', message };
  }

  /** `translation.changed` after commit, when the import wrote anything. */
  private async imported(task: TaskEntity, changes: number): Promise<TaskOutcome> {
    await this.log.log(task, 'INFO', `total changes : ${changes}`);
    if (changes) this.webhooks.dispatch(task.spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return { status: 'FINISHED' };
  }
}
