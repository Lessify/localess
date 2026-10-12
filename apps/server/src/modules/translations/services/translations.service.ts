import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Translation, TranslationType, WebHookEvent } from '@localess/shared';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { SpaceLocalesRepository } from '../repositories/space-locales.repository.js';
import { TranslationSnapshotsRepository } from '../repositories/translation-snapshots.repository.js';
import { type TranslationEntity, TranslationsRepository } from '../repositories/translations.repository.js';
import { toTranslation } from '../../../shared/transformers/translation.transformer.js';
import { TranslateService } from './translate.service.js';

/** Values are written only for the space's locales (removing one is allowed for any locale). */
function requireSpaceLocales(space: Pick<SpaceRow, 'locales'>, localeIds: string[]): void {
  const unknown = localeIds.filter(id => !space.locales.some(it => it.id === id));
  if (unknown.length) throw new BadRequestException(`Not in space locales: ${unknown.join(', ')}`);
}

function found(entity: TranslationEntity | undefined): Translation {
  if (!entity) throw new NotFoundException('Translation not found');
  return toTranslation(entity);
}

/**
 * Translation keys of a space for the app. Routes use the UUID `id`; `key` is the translation key, unique per space.
 * Every write fires `translation.changed` after commit — what the SPA's `translation-publishdraft` call after each
 * write used to do (the repository drops the draft maps in the write's transaction).
 */
@Injectable()
export class TranslationsService {
  constructor(
    private readonly translations: TranslationsRepository,
    private readonly snapshots: TranslationSnapshotsRepository,
    private readonly spaces: SpaceLocalesRepository,
    private readonly webhooks: WebhookDispatcher,
    private readonly translate: TranslateService,
  ) {}

  async list(spaceId: string): Promise<Translation[]> {
    return (await this.translations.findAll(spaceId)).map(toTranslation);
  }

  count(spaceId: string): Promise<number> {
    return this.translations.count(spaceId);
  }

  async get(spaceId: string, id: string): Promise<Translation> {
    return found(await this.translations.findById(spaceId, id));
  }

  async create(
    spaceId: string,
    input: { key: string; type: TranslationType; locales: Record<string, string>; labels?: string[]; description?: string },
  ): Promise<Translation> {
    requireSpaceLocales(await this.spaces.require(spaceId), Object.keys(input.locales));
    const entity = await this.translations.create(spaceId, {
      ...input,
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, toTranslation(entity));
  }

  async update(spaceId: string, id: string, input: { labels?: string[]; description?: string }): Promise<Translation> {
    await this.spaces.require(spaceId);
    const entity = await this.translations.update(spaceId, id, {
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, found(entity));
  }

  /** One locale's value, for a locale of the space; an empty string removes it (for any locale: leftovers of a removed locale). */
  async updateLocale(spaceId: string, id: string, locale: string, value: string): Promise<Translation> {
    const space = await this.spaces.require(spaceId);
    if (value) requireSpaceLocales(space, [locale]);
    return this.changed(spaceId, found(await this.translations.setLocale(spaceId, id, locale, value)));
  }

  /** Changes the key; the id stays. */
  async rename(spaceId: string, id: string, key: string): Promise<Translation> {
    await this.spaces.require(spaceId);
    return this.changed(spaceId, found(await this.translations.update(spaceId, id, { key })));
  }

  async delete(spaceId: string, id: string): Promise<void> {
    await this.spaces.require(spaceId);
    if (!(await this.translations.delete(spaceId, id))) throw new NotFoundException('Translation not found');
    this.changed(spaceId, undefined);
  }

  /** Removes every key (the published maps stay until the next publish, as before). */
  async deleteAll(spaceId: string): Promise<void> {
    await this.spaces.require(spaceId);
    await this.translations.deleteAll(spaceId);
    this.changed(spaceId, undefined);
  }

  /**
   * The published map of every locale, filled from the default locale (was the `translation-publish` callable); the
   * new `built_at` is the published cv. Publishing an empty space is allowed and serves `{}`.
   */
  async publish(spaceId: string): Promise<void> {
    await this.snapshots.publish(spaceId);
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_PUBLISHED);
  }

  /**
   * Machine-translates every key that has a source value (and no target value, unless `overwrite`).
   * Returns how many keys were written; keys the provider failed on are left untouched.
   */
  async translateLocale(
    spaceId: string,
    sourceLocale: string,
    targetLocale: string,
    overwrite: boolean,
  ): Promise<{ translated: number; failed: number }> {
    this.translate.requireProvider();
    requireSpaceLocales(await this.spaces.require(spaceId), [sourceLocale, targetLocale]);
    const candidates = (await this.translations.findAll(spaceId)).filter(
      row => row.locales[sourceLocale] && (overwrite || !row.locales[targetLocale]),
    );
    if (!candidates.length) return { translated: 0, failed: 0 };
    const result = await this.translate.translateItems(
      candidates.map(row => ({ id: row.id, content: row.locales[sourceLocale] })),
      sourceLocale,
      targetLocale,
    );
    const written = result.items.filter(it => it.content);
    if (written.length) {
      const values = written.map(it => ({ id: it.id, value: it.content }));
      await this.translations.setLocaleValues(spaceId, targetLocale, values);
      this.changed(spaceId, undefined);
    }
    return { translated: written.length, failed: result.failed.length };
  }

  /** After a committed write: `translation.changed`. */
  private changed<T>(spaceId: string, result: T): T {
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return result;
  }
}
