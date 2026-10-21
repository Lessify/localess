import {
  type Translation,
  type TranslationCreate,
  type TranslationLocaleUpdate,
  type TranslationRename,
  type TranslationTranslateLocale,
  type TranslationUpdate,
  WebhookEvent,
} from '@localess/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { toTranslation } from '../../../shared/transformers/translation.transformer.js';
import { TranslationRepository } from '../repositories/translation.repository.js';
import { TranslationSnapshotRepository } from '../repositories/translation-snapshot.repository.js';
import { TranslateService } from './translate.service.js';

/** Values are written only for the space's locales (removing one is allowed for any locale). */
function requireSpaceLocales(space: SpaceWithLocales, localeIds: string[]): void {
  const unknown = localeIds.filter(id => !space.spaceLocales.some(it => it.localeId === id));
  if (unknown.length) throw new BadRequestException(`Not in space locales: ${unknown.join(', ')}`);
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
    private readonly spaceLookupRepository: SpaceLookupRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly translateService: TranslateService,
  ) {}

  async findAll(spaceId: string): Promise<Translation[]> {
    await this.requireSpace(spaceId);
    return (await this.translationRepository.findAll(spaceId)).map(toTranslation);
  }

  async count(spaceId: string): Promise<number> {
    await this.requireSpace(spaceId);
    return this.translationRepository.count(spaceId);
  }

  async findOne(spaceId: string, translationId: string): Promise<Translation> {
    await this.requireSpace(spaceId);
    return this.findTranslation(spaceId, translationId);
  }

  async create(spaceId: string, input: TranslationCreate): Promise<Translation> {
    requireSpaceLocales(await this.requireSpace(spaceId), Object.keys(input.locales));
    const translationId = await this.translationRepository.create(spaceId, {
      ...input,
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, await this.findTranslation(spaceId, translationId));
  }

  async update(spaceId: string, translationId: string, input: TranslationUpdate): Promise<Translation> {
    await this.requireTranslation(spaceId, translationId);
    await this.translationRepository.update(spaceId, translationId, {
      labels: input.labels?.length ? input.labels : null,
      description: input.description || null,
    });
    return this.changed(spaceId, await this.findTranslation(spaceId, translationId));
  }

  /** One locale's value, for a locale of the space; an empty string removes it (for any locale: leftovers of a removed locale). */
  async updateLocale(spaceId: string, translationId: string, localeId: string, input: TranslationLocaleUpdate): Promise<Translation> {
    const space = await this.requireTranslation(spaceId, translationId);
    if (input.value) requireSpaceLocales(space, [localeId]);
    await this.translationRepository.updateLocale(spaceId, translationId, localeId, input.value);
    return this.changed(spaceId, await this.findTranslation(spaceId, translationId));
  }

  /** Changes the key; the id stays. */
  async rename(spaceId: string, translationId: string, input: TranslationRename): Promise<Translation> {
    await this.requireTranslation(spaceId, translationId);
    await this.translationRepository.update(spaceId, translationId, { key: input.key });
    return this.changed(spaceId, await this.findTranslation(spaceId, translationId));
  }

  async remove(spaceId: string, translationId: string): Promise<void> {
    await this.requireTranslation(spaceId, translationId);
    await this.translationRepository.delete(spaceId, translationId);
    this.changed(spaceId, undefined);
  }

  /** Removes every key (the published maps stay until the next publish, as before). */
  async removeAll(spaceId: string): Promise<void> {
    await this.requireSpace(spaceId);
    await this.translationRepository.deleteAll(spaceId);
    this.changed(spaceId, undefined);
  }

  /**
   * The published map of every locale, filled from the default locale (was the `translation-publish` callable); the
   * new `built_at` is the published cv. Publishing an empty space is allowed and serves `{}`.
   */
  async publish(spaceId: string): Promise<void> {
    await this.requireSpace(spaceId);
    await this.translationSnapshotRepository.publish(spaceId);
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.TRANSLATION_PUBLISHED);
  }

  /**
   * Machine-translates every key that has a source value (and no target value, unless `overwrite`).
   * Returns how many keys were written; keys the provider failed on are left untouched.
   */
  async translateLocale(spaceId: string, input: TranslationTranslateLocale): Promise<{ translated: number; failed: number }> {
    const { sourceLocaleId: sourceLocale, targetLocaleId: targetLocale } = input;
    const overwrite = input.overwrite === true;
    // The space first (404), then the locales (400), then whether machine translation is configured (412).
    requireSpaceLocales(await this.requireSpace(spaceId), [sourceLocale, targetLocale]);
    this.translateService.requireProvider();
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
      await this.translationRepository.updateLocaleValues(spaceId, targetLocale, values);
      this.changed(spaceId, undefined);
    }
    return { translated: written.length, failed: result.failed.length };
  }

  /** After a committed write: `translation.changed`. */
  private changed<T>(spaceId: string, result: T): T {
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.TRANSLATION_CHANGED);
    return result;
  }

  /** The space, then the translation: "Space not found" comes before "Translation not found". */
  private async requireTranslation(spaceId: string, translationId: string): Promise<SpaceWithLocales> {
    const space = await this.requireSpace(spaceId);
    await this.findTranslation(spaceId, translationId);
    return space;
  }

  /** The translation alone, the space already checked (a read, or the re-read after a write). */
  private async findTranslation(spaceId: string, translationId: string): Promise<Translation> {
    const entity = await this.translationRepository.findOne(spaceId, translationId);
    if (!entity) throw new NotFoundException('Translation not found');
    return toTranslation(entity);
  }

  /** The space with its locales; a 404 when there is none. */
  private async requireSpace(spaceId: string): Promise<SpaceWithLocales> {
    const space = await this.spaceLookupRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}
