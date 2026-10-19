import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Translation, WebHookEvent } from '@localess/shared';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { SpaceLocaleRepository } from '../repositories/space-locale.repository.js';
import { TranslationSnapshotRepository } from '../repositories/translation-snapshot.repository.js';
import { TranslationRepository } from '../repositories/translation.repository.js';
import { toTranslation } from '../../../shared/transformers/translation.transformer.js';
import { TranslateService } from './translate.service.js';
import type { TranslationEntity } from '../../../shared/entities/translation.entity.js';

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
export class TranslationService {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly translationSnapshotRepository: TranslationSnapshotRepository,
    private readonly spaceLocaleRepository: SpaceLocaleRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly translateService: TranslateService,
  ) {}

  async findAll(spaceId: string): Promise<Translation[]> {
    return (await this.translationRepository.findAll(spaceId)).map(toTranslation);
  }

  count(spaceId: string): Promise<number> {
    return this.translationRepository.count(spaceId);
  }

  async findOne(spaceId: string, id: string): Promise<Translation> {
    return found(await this.translationRepository.findById(spaceId, id));
  }

  async create(
    spaceId: string,
    input: { key: string; locales: Record<string, string>; labels?: string[]; description?: string },
  ): Promise<Translation> {
    requireSpaceLocales(await this.spaceLocaleRepository.require(spaceId), Object.keys(input.locales));
    const entity = await this.translationRepository.create(spaceId, {
      ...input,
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, toTranslation(entity));
  }

  async update(spaceId: string, id: string, input: { labels?: string[]; description?: string }): Promise<Translation> {
    await this.spaceLocaleRepository.require(spaceId);
    const entity = await this.translationRepository.update(spaceId, id, {
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, found(entity));
  }

  /** One locale's value, for a locale of the space; an empty string removes it (for any locale: leftovers of a removed locale). */
  async updateLocale(spaceId: string, id: string, locale: string, value: string): Promise<Translation> {
    const space = await this.spaceLocaleRepository.require(spaceId);
    if (value) requireSpaceLocales(space, [locale]);
    return this.changed(spaceId, found(await this.translationRepository.setLocale(spaceId, id, locale, value)));
  }

  /** Changes the key; the id stays. */
  async rename(spaceId: string, id: string, key: string): Promise<Translation> {
    await this.spaceLocaleRepository.require(spaceId);
    return this.changed(spaceId, found(await this.translationRepository.update(spaceId, id, { key })));
  }

  async remove(spaceId: string, id: string): Promise<void> {
    await this.spaceLocaleRepository.require(spaceId);
    if (!(await this.translationRepository.delete(spaceId, id))) throw new NotFoundException('Translation not found');
    this.changed(spaceId, undefined);
  }

  /** Removes every key (the published maps stay until the next publish, as before). */
  async removeAll(spaceId: string): Promise<void> {
    await this.spaceLocaleRepository.require(spaceId);
    await this.translationRepository.deleteAll(spaceId);
    this.changed(spaceId, undefined);
  }

  /**
   * The published map of every locale, filled from the default locale (was the `translation-publish` callable); the
   * new `built_at` is the published cv. Publishing an empty space is allowed and serves `{}`.
   */
  async publish(spaceId: string): Promise<void> {
    await this.translationSnapshotRepository.publish(spaceId);
    this.webhookDispatcher.dispatch(spaceId, WebHookEvent.TRANSLATION_PUBLISHED);
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
    this.translateService.requireProvider();
    requireSpaceLocales(await this.spaceLocaleRepository.require(spaceId), [sourceLocale, targetLocale]);
    const candidates = (await this.translationRepository.findAll(spaceId)).filter(
      row => row.locales[sourceLocale] && (overwrite || !row.locales[targetLocale]),
    );
    if (!candidates.length) return { translated: 0, failed: 0 };
    const result = await this.translateService.translateItems(
      candidates.map(row => ({ id: row.id, content: row.locales[sourceLocale] })),
      sourceLocale,
      targetLocale,
    );
    const written = result.items.filter(it => it.content);
    if (written.length) {
      const values = written.map(it => ({ id: it.id, value: it.content }));
      await this.translationRepository.setLocaleValues(spaceId, targetLocale, values);
      this.changed(spaceId, undefined);
    }
    return { translated: written.length, failed: result.failed.length };
  }

  /** After a committed write: `translation.changed`. */
  private changed<T>(spaceId: string, result: T): T {
    this.webhookDispatcher.dispatch(spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return result;
  }
}
