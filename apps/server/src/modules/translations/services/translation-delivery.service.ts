import { Injectable } from '@nestjs/common';
import { type TranslationUpdateResponse, WebHookEvent } from '@localess/shared';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import type { SpaceRow } from '../../../infra/http/space-access.js';
import { SpaceLocalesRepository } from '../repositories/space-locales.repository.js';
import { type TranslationSnapshotEntity, TranslationSnapshotsRepository } from '../repositories/translation-snapshots.repository.js';
import { TranslationsRepository } from '../repositories/translations.repository.js';
import { translationsByKey } from '../../../shared/transformers/translation.transformer.js';
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
    private readonly translations: TranslationsRepository,
    private readonly snapshots: TranslationSnapshotsRepository,
    private readonly webhooks: WebhookDispatcher,
    private readonly spaces: SpaceLocalesRepository,
  ) {}

  findSpace(spaceId: string): Promise<SpaceRow | undefined> {
    return this.spaces.find(spaceId);
  }

  /** The published map of a space locale; a locale published never (added since) gets the default locale's map. */
  async findPublished(spaceId: string, locale: string, defaultLocale: string): Promise<TranslationSnapshotEntity | undefined> {
    return (
      (await this.snapshots.find(spaceId, 'published', locale)) ??
      (locale !== defaultLocale ? await this.snapshots.find(spaceId, 'published', defaultLocale) : undefined)
    );
  }

  /** The draft map of a space locale, building every locale's when a write dropped them. */
  async findDraft(spaceId: string, locale: string): Promise<TranslationSnapshotEntity | undefined> {
    return (
      (await this.snapshots.find(spaceId, 'draft', locale)) ?? (await this.snapshots.buildDrafts(spaceId)).find(it => it.locale === locale)
    );
  }

  /** The values stored for one locale, with no fallback filling: a key the locale has no value for is absent. */
  async storedValues(spaceId: string, locale: string): Promise<Record<string, string>> {
    return storedLocaleValues(translationsByKey(await this.translations.findAllInByteOrder(spaceId)), locale);
  }

  /**
   * The CLI's push of one locale's values, in one transaction; `dryRun` only reports what it would change. Fires
   * `translation.changed` after commit, as an edit in the app does.
   */
  async push(
    spaceId: string,
    locale: string,
    type: TranslationPushType,
    values: Record<string, string>,
    dryRun?: boolean,
  ): Promise<TranslationUpdateResponse> {
    // add-missing / update-existing only need the pushed keys; the delete types need every key.
    const rows =
      type === 'delete-missing-key' || type === 'delete-missing-value'
        ? await this.translations.findAllInByteOrder(spaceId)
        : await this.translations.findByKeys(spaceId, Object.getOwnPropertyNames(values));
    const plan = planTranslationUpdate(translationsByKey(rows), locale, values);
    const actionable = {
      'add-missing': plan.creates,
      'update-existing': plan.updates,
      'delete-missing-key': plan.keyDeletes,
      'delete-missing-value': plan.valueDeletes,
    }[type];
    const { verb, past } = PUSH_VERBS[type];
    const noun = PUSH_VERBS[type].noun[actionable.length === 1 ? 0 : 1];

    if (actionable.length === 0) return { message: `No ${PUSH_VERBS[type].noun[1]} to ${verb}`, ids: [], dryRun };
    if (dryRun) return { message: `[DryRun] Would ${verb} ${actionable.length} ${noun}`, ids: actionable, dryRun: true };

    const pick = () => Object.fromEntries(actionable.map(key => [key, values[key]]));
    if (type === 'add-missing') await this.translations.addKeys(spaceId, locale, pick());
    else if (type === 'update-existing') await this.translations.setLocaleByKeys(spaceId, locale, pick());
    else if (type === 'delete-missing-value') await this.translations.removeLocaleByKeys(spaceId, locale, actionable);
    else await this.translations.deleteByKeys(spaceId, actionable);
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return { message: `${past} ${actionable.length} ${noun}`, ids: actionable };
  }
}
