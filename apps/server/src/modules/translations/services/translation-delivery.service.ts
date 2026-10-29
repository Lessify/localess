import { isTranslationKey, type TranslationUpdateResponse, WebhookEvent } from '@localess/shared';
import { Injectable } from '@nestjs/common';

import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import type { TranslationSnapshotEntity } from '../../../shared/entities/translation-snapshot.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { translationsByKey } from '../../../shared/transformers/translation.transformer.js';
import { TranslationRepository } from '../repositories/translation.repository.js';
import { TranslationSnapshotRepository } from '../repositories/translation-snapshot.repository.js';
import { planTranslationUpdate, storedLocaleValues } from '../utils/translation.utils.js';

export type TranslationPushType = 'add-missing' | 'update-existing' | 'delete-missing-key' | 'delete-missing-value';

/** Per-type verb labels used for response messages. */
const PUSH_VERBS: Record<TranslationPushType, { verb: string; past: string; noun: [string, string] }> = {
  'add-missing': { verb: 'add', past: 'Added', noun: ['translation', 'translations'] },
  'update-existing': { verb: 'update', past: 'Updated', noun: ['translation', 'translations'] },
  // Removes the whole translation, in every locale.
  'delete-missing-key': { verb: 'delete', past: 'Deleted', noun: ['translation key', 'translation keys'] },
  // Removes only the pushed locale's value; other locales keep theirs.
  'delete-missing-value': { verb: 'remove', past: 'Removed', noun: ['locale value', 'locale values'] },
};

/**
 * Translations on the public v1 API: the maps per stage and locale (translation_snapshots), the raw stored values for
 * the CLI, and the CLI's push. The caller has checked that `locale` is one of the space's locales.
 */
@Injectable()
export class TranslationDeliveryService {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly translationSnapshotRepository: TranslationSnapshotRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  findSpace(spaceId: string): Promise<SpaceWithLocales | undefined> {
    return this.spaceLookupRepository.findOne(spaceId);
  }

  /** The published map of a space locale; a locale published never (added since) gets the default locale's map. */
  async findPublished(spaceId: string, locale: string, defaultLocale: string): Promise<TranslationSnapshotEntity | undefined> {
    return (
      (await this.translationSnapshotRepository.findOne(spaceId, 'published', locale)) ??
      (locale !== defaultLocale ? await this.translationSnapshotRepository.findOne(spaceId, 'published', defaultLocale) : undefined)
    );
  }

  /** The draft map of a space locale, building every locale's when a write dropped them. */
  async findDraft(spaceId: string, locale: string): Promise<TranslationSnapshotEntity | undefined> {
    return (
      (await this.translationSnapshotRepository.findOne(spaceId, 'draft', locale)) ??
      (await this.translationSnapshotRepository.buildDrafts(spaceId)).find(it => it.locale === locale)
    );
  }

  /** The values stored for one locale, with no fallback filling: a key the locale has no value for is absent. */
  async storedValues(spaceId: string, locale: string): Promise<Record<string, string>> {
    return storedLocaleValues(translationsByKey(await this.translationRepository.findAllInByteOrder(spaceId)), locale);
  }

  /**
   * The CLI's push of one locale's values, in one transaction; `dryRun` only reports what it would change. Fires
   * `translation.changed` after commit, as an edit in the app does. Keys it would create outside the key rule refuse
   * the whole push (`invalidKeys`), dry run or not; existing keys are updated whatever their form.
   */
  async push(
    spaceId: string,
    locale: string,
    type: TranslationPushType,
    values: Record<string, string>,
    dryRun?: boolean,
  ): Promise<TranslationUpdateResponse | { invalidKeys: string[] }> {
    // add-missing / update-existing only need the pushed keys; the delete types need every key.
    const rows =
      type === 'delete-missing-key' || type === 'delete-missing-value'
        ? await this.translationRepository.findAllInByteOrder(spaceId)
        : await this.translationRepository.findByKeys(spaceId, Object.getOwnPropertyNames(values));
    const plan = planTranslationUpdate(translationsByKey(rows), locale, values);
    const actionable = {
      'add-missing': plan.creates,
      'update-existing': plan.updates,
      'delete-missing-key': plan.keyDeletes,
      'delete-missing-value': plan.valueDeletes,
    }[type];
    if (type === 'add-missing') {
      const invalidKeys = actionable.filter(key => !isTranslationKey(key));
      if (invalidKeys.length) return { invalidKeys };
    }
    const { verb, past } = PUSH_VERBS[type];
    const noun = PUSH_VERBS[type].noun[actionable.length === 1 ? 0 : 1];

    if (actionable.length === 0) return { message: `No ${PUSH_VERBS[type].noun[1]} to ${verb}`, ids: [], dryRun };
    if (dryRun) return { message: `[DryRun] Would ${verb} ${actionable.length} ${noun}`, ids: actionable, dryRun: true };

    const pick = () => Object.fromEntries(actionable.map(key => [key, values[key]]));
    if (type === 'add-missing') await this.translationRepository.insertKeys(spaceId, locale, pick());
    else if (type === 'update-existing') await this.translationRepository.updateLocaleByKeys(spaceId, locale, pick());
    else if (type === 'delete-missing-value') await this.translationRepository.deleteLocaleByKeys(spaceId, locale, actionable);
    else await this.translationRepository.deleteByKeys(spaceId, actionable);
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.TRANSLATION_CHANGED);
    return { message: `${past} ${actionable.length} ${noun}`, ids: actionable };
  }
}
