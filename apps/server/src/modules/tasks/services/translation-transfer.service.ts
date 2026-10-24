import { isTranslationKey, type TranslationJsonFlatParams, WebhookEvent } from '@localess/shared';
import { zTranslationFlatFile, zTranslationLine } from '@localess/shared/zod';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import type { TranslationEntity } from '../../../shared/entities/translation.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import {
  type TranslationImportWrite,
  type TranslationLocaleWrite,
  TranslationTransferRepository,
} from '../repositories/translation-transfer.repository.js';
import { isTranslationChanged } from '../utils/import-diff.js';
import { LINES_ENTRY, type LocalessFile, writeLocalessFile } from '../utils/localess-file.js';
import {
  exportFileName,
  formatCounts,
  MAX_LOCALE_FILE_BYTES,
  type TaskCounts,
  taskFileKey,
  type TaskOutcome,
  type TaskProblem,
} from '../utils/task.utils.js';
import type { TaskProgressReporter } from '../utils/task-progress.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';

/** Rows read, and keys written, per round trip to the database. */
const BATCH = 500;

/** TRANSLATION_EXPORT and TRANSLATION_IMPORT: the whole `.localess.zip`, or one locale from a key-value JSON (`params.type`). */
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

  /** Every key with its locales, description and labels, streamed page by page into `translations.jsonl`. */
  async export(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const space = await this.requireSpace(task.spaceId);
    const count = await this.translationTransferRepository.findAllCount(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `exporting all ${count} translations`);
    const repository = this.translationTransferRepository;
    async function* lines(): AsyncIterable<object> {
      let done = 0;
      let afterKey: string | undefined;
      for (;;) {
        const rows = await repository.findBatch(task.spaceId, afterKey, BATCH);
        for (const row of rows) yield toTranslationLine(row);
        done += rows.length;
        await progress.report('Writing', done, count);
        if (rows.length < BATCH) return;
        afterKey = rows[rows.length - 1].key;
      }
    }
    const source = { spaceId: space.id, spaceName: space.name, locales: space.spaceLocales.map(it => it.localeId) };
    const name = exportFileName(space.name, 'translations');
    const size = await writeLocalessFile(
      this.storage,
      taskFileKey(task, name),
      { kind: 'TRANSLATION', source, count },
      LINES_ENTRY.TRANSLATION,
      lines(),
    );
    await progress.flush();
    return { status: 'FINISHED', file: { name, size } };
  }

  /**
   * A `.localess.zip` (or an old `.llt.zip`), matched by key: missing keys added, existing ones updated (values merged by
   * locale, description and labels replaced). All or nothing: every line is checked first, then all are written in one
   * transaction. Values of locales the space does not have are skipped.
   */
  async import(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const { spaceId } = task;
    await progress.report('Reading file', 0);
    const opened = await this.importFileService.open(task, 'TRANSLATION');
    if (!('lines' in opened)) return opened;
    const file: LocalessFile = opened;
    const spaceLocales = new Set((await this.requireSpace(spaceId)).spaceLocales.map(it => it.localeId));
    const existing = new Map((await this.translationTransferRepository.findAll(spaceId)).map(row => [row.key, row]));

    let total = 0;
    const problems: TaskProblem[] = [];
    let problemCount = 0;
    const seen = new Set<string>();
    for await (const { index, value } of file.lines()) {
      total++;
      if (total % BATCH === 0) await progress.report('Checking', total, file.count);
      const line = zTranslationLine.safeParse(value);
      if (!line.success) {
        for (const issue of line.error.issues) {
          problemCount++;
          if (problems.length < 100)
            problems.push({ path: `translations[${index}]${issue.path.map(it => `.${String(it)}`).join('')}`, message: issue.message });
        }
      } else if (seen.has(line.data.key)) {
        problemCount++;
        if (problems.length < 100) problems.push({ path: `translations[${index}].key`, message: 'duplicate key' });
      } else {
        seen.add(line.data.key);
        if (!existing.has(line.data.key) && !isTranslationKey(line.data.key)) {
          problemCount++;
          if (problems.length < 100) problems.push({ path: `translations[${index}].key`, message: 'invalid key' });
        }
      }
    }
    if (problemCount) return this.importFileService.refused(task, problemCount, problems);
    await this.taskLogService.log(task, 'INFO', `valid=${total}`);

    const result: TaskCounts = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    const skippedLocales = new Set<string>();
    async function* batches(): AsyncIterable<TranslationImportWrite[]> {
      let batch: TranslationImportWrite[] = [];
      let done = 0;
      for await (const { value } of file.lines()) {
        const line = zTranslationLine.parse(value);
        const values: Record<string, string> = {};
        for (const [locale, text] of Object.entries(line.locales)) {
          if (spaceLocales.has(locale)) values[locale] = text;
          else {
            result.skipped++;
            skippedLocales.add(locale);
          }
        }
        const current = existing.get(line.key);
        // The file's values only: the database merges them into the row's (a value saved meanwhile stays).
        const columns = { locales: values, description: line.description || null, labels: line.labels?.length ? line.labels : null };
        if (!current) result.created++;
        else if (isTranslationChanged(current, { ...columns, locales: { ...current.locales, ...values } })) result.updated++;
        else {
          result.unchanged++;
          continue;
        }
        batch.push({ key: line.key, columns });
        if (batch.length === BATCH) {
          done += batch.length;
          yield batch;
          batch = [];
          await progress.report('Writing', done, total);
        }
      }
      yield batch;
    }
    const written = await this.translationTransferRepository.applyImport(spaceId, batches());
    await progress.report('Writing', total, total);
    await progress.flush();
    if (skippedLocales.size) {
      await this.taskLogService.log(
        task,
        'WARN',
        `skipped ${result.skipped} values of locales not in the space: ${[...skippedLocales].sort().join(', ')}`,
      );
    }
    return this.imported(task, written, result);
  }

  /**
   * A key-value JSON file (`{ key: value }`, read whole: at most 50 MB, checked at upload) into `task.locale`: existing keys
   * get that locale's value, missing keys are added with it. All or nothing: a new key outside the key rule refuses it.
   */
  async importLocale(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const { spaceId } = task;
    const { locale } = task.params as TranslationJsonFlatParams;
    const key = taskFileKey(task, task.file?.name ?? '');
    await progress.report('Reading file', 0);
    let raw: unknown;
    try {
      const stat = await this.storage.stat(key);
      if (!stat || stat.size > MAX_LOCALE_FILE_BYTES) throw new Error('missing or too large');
      raw = JSON.parse((await this.storage.read(key)).toString('utf8'));
    } catch {
      return this.importFileService.fail(task, 'It is not a JSON file of keys and values.');
    }
    if (!(await this.requireSpace(spaceId)).spaceLocales.some(it => it.localeId === locale)) {
      return this.importFileService.fail(task, `Locale ${locale} is not in the space locales.`);
    }
    const parse = zTranslationFlatFile.safeParse(raw);
    if (!parse.success) {
      const problems = parse.error.issues.map(issue => ({ path: issue.path.map(String).join('.') || '(file)', message: issue.message }));
      return this.importFileService.refused(task, problems.length, problems);
    }
    const values = parse.data;
    const total = Object.keys(values).length;
    await progress.report('Checking', 0, total);
    const existing = new Map((await this.translationTransferRepository.findAll(spaceId)).map(row => [row.key, row]));
    const result: TaskCounts = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    const writes: TranslationLocaleWrite[] = [];
    const problems: TaskProblem[] = [];
    for (const [key, value] of Object.entries(values)) {
      const current = existing.get(key);
      if (!current) {
        if (!isTranslationKey(key)) problems.push({ path: key, message: 'invalid key' });
        writes.push({ op: 'insert', key, value });
        result.created++;
      } else if (current.locales[locale] === value) {
        result.unchanged++;
      } else {
        writes.push({ op: 'update', key, value });
        result.updated++;
      }
    }
    if (problems.length) return this.importFileService.refused(task, problems.length, problems);
    await progress.report('Writing', 0, writes.length);
    const written = await this.translationTransferRepository.applyLocaleImport(spaceId, locale, writes);
    await progress.report('Writing', writes.length, writes.length);
    await progress.flush();
    return this.imported(task, written, result);
  }

  /** Its counts as a log line; `translation.changed` after commit, when the import wrote anything. */
  private async imported(task: TaskEntity, changes: number, counts: TaskCounts): Promise<TaskOutcome> {
    await this.taskLogService.log(task, 'INFO', formatCounts(counts));
    if (changes) this.webhookDispatcher.dispatch(task.spaceId, WebhookEvent.TRANSLATION_CHANGED);
    return { status: 'FINISHED' };
  }

  /** The space with its locales; a 404 when it is gone. */
  private async requireSpace(spaceId: string): Promise<SpaceWithLocales> {
    const space = await this.spaceLookupRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}

/** A row as a line of `translations.jsonl`: empty description and labels left out. */
function toTranslationLine(row: TranslationEntity): object {
  return {
    key: row.key,
    locales: row.locales,
    ...(row.description ? { description: row.description } : {}),
    ...(row.labels?.length ? { labels: row.labels } : {}),
  };
}
