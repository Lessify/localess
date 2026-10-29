import { type TranslationTranslateParams, WebhookEvent } from '@localess/shared';
import { Injectable } from '@nestjs/common';

import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { TranslateService } from '../../../shared/services/translate.service.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { TranslationTransferRepository } from '../repositories/translation-transfer.repository.js';
import { formatCounts, type TaskOutcome, type TaskProblem } from '../utils/task.utils.js';
import type { TaskProgressReporter } from '../utils/task-progress.js';
import { TaskLogService } from './task-log.service.js';

/** Keys sent to the provider per round, so the progress moves. */
const CHUNK = 100;

/**
 * TRANSLATION_TRANSLATE: machine-translates the keys with a source value and (unless `overwrite`) no target value. All or
 * nothing: the values are written in one transaction at the end, so an interrupted run writes none. Keys the provider
 * failed on are skipped and listed.
 */
@Injectable()
export class TranslationTranslateService {
  constructor(
    private readonly translationTransferRepository: TranslationTransferRepository,
    private readonly translateService: TranslateService,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly taskLogService: TaskLogService,
  ) {}

  async translate(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const { sourceLocale, targetLocale, overwrite } = task.params as TranslationTranslateParams;
    const rows = await this.translationTransferRepository.findAll(task.spaceId);
    const candidates = rows.filter(row => row.locales[sourceLocale] && (overwrite || !row.locales[targetLocale]));
    await this.taskLogService.log(task, 'INFO', `translating ${candidates.length} keys from ${sourceLocale} to ${targetLocale}`);
    const keyOf = new Map(rows.map(row => [row.id, row.key]));
    const values: { id: string; value: string }[] = [];
    const problems: TaskProblem[] = [];
    let failed = 0;
    for (let start = 0; start < candidates.length; start += CHUNK) {
      await progress.report('Translating', start, candidates.length);
      const chunk = candidates.slice(start, start + CHUNK);
      const translated = await this.translateService.translateItems(
        chunk.map(row => ({ id: row.id, content: row.locales[sourceLocale] })),
        sourceLocale,
        targetLocale,
      );
      for (const item of translated.items) if (item.content) values.push({ id: item.id, value: item.content });
      for (const item of translated.failed) {
        failed++;
        if (problems.length < 100) problems.push({ path: keyOf.get(item.id) ?? item.id, message: item.reason });
      }
    }
    await progress.report('Translating', candidates.length, candidates.length);
    await progress.flush();
    // Saving the values (one transaction) is a step of its own, as in the imports: it can take seconds on a large space.
    await progress.report('Writing', 0, values.length);
    if (values.length) {
      await this.translationTransferRepository.updateLocaleValues(task.spaceId, targetLocale, values, !overwrite);
      this.webhookDispatcher.dispatch(task.spaceId, WebhookEvent.TRANSLATION_CHANGED);
    }
    await progress.report('Writing', values.length, values.length);
    await progress.flush();
    // Keys the provider failed on: WARN lines (`key: reason`, at most 100), the task still FINISHED.
    await this.taskLogService.logMany(task, [
      { level: 'INFO', message: formatCounts({ created: 0, updated: values.length, unchanged: 0, skipped: failed }) },
      ...problems.map(problem => ({ level: 'WARN' as const, message: `${problem.path}: ${problem.message}` })),
    ]);
    return { status: 'FINISHED' };
  }
}
