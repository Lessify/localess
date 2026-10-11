import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LOCALE, type SpaceOverview } from '@localess/shared';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { StorageSweeperService } from '../../../shared/services/storage-sweeper.service.js';
import { toPublicSpace, toSpace } from '../../../shared/transformers/space.transformer.js';
import { LocalesRepository } from '../repositories/locales.repository.js';
import { SpaceOverviewRepository } from '../repositories/space-overview.repository.js';
import { SpacesRepository } from '../repositories/spaces.repository.js';

/** `ids` lists each of `current` once, in any order. */
function isPermutation(ids: string[], current: string[]): boolean {
  const known = new Set(current);
  return ids.length === known.size && new Set(ids).size === ids.length && ids.every(id => known.has(id));
}

/** Spaces, their locales and environments, and the dashboard overview. */
@Injectable()
export class SpacesService {
  constructor(
    private readonly spaces: SpacesRepository,
    private readonly locales: LocalesRepository,
    private readonly overviews: SpaceOverviewRepository,
    private readonly sweeper: StorageSweeperService,
  ) {}

  async list() {
    return (await this.spaces.findAll()).map(toSpace);
  }

  async get(spaceId: string) {
    return toSpace(await this.require(spaceId));
  }

  /** The space on the public API, or undefined (it answers 404 itself). */
  async findPublic(spaceId: string) {
    const space = await this.spaces.findById(spaceId);
    return space && toPublicSpace(space);
  }

  async create(name: string) {
    return toSpace(await this.spaces.create(name, DEFAULT_LOCALE.id));
  }

  async rename(spaceId: string, name: string) {
    await this.require(spaceId);
    return toSpace(await this.spaces.rename(spaceId, name));
  }

  /** At the end of the space's list. */
  async createEnvironment(spaceId: string, environment: { name: string; url: string }) {
    await this.require(spaceId);
    return toSpace(await this.spaces.addEnvironment(spaceId, environment));
  }

  async updateEnvironment(spaceId: string, environmentId: string, environment: { name: string; url: string }) {
    await this.require(spaceId);
    return toSpace(this.environmentFound(await this.spaces.updateEnvironment(spaceId, environmentId, environment)));
  }

  async deleteEnvironment(spaceId: string, environmentId: string) {
    await this.require(spaceId);
    return toSpace(this.environmentFound(await this.spaces.deleteEnvironment(spaceId, environmentId)));
  }

  /** `environmentIds` is the space's environments in their new order: every one of them, each once. */
  async reorderEnvironments(spaceId: string, environmentIds: string[]) {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        environmentIds,
        space.environments.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's environments once");
    }
    return toSpace(await this.spaces.reorderEnvironments(spaceId, environmentIds));
  }

  /** Adds a locale from `locales` at the end of the space's list (no-op when it is already there, like `arrayUnion`). */
  async addLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (space.locales.some(it => it.id === localeId)) return toSpace(space);
    if (!(await this.locales.exists(localeId))) throw new BadRequestException(`Unknown locale ${localeId}`);
    return toSpace(await this.spaces.addLocale(spaceId, localeId));
  }

  async removeLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (space.defaultLocaleId === localeId) {
      throw new BadRequestException('The default locale cannot be removed; make another locale the default first');
    }
    return toSpace(await this.spaces.removeLocale(spaceId, localeId));
  }

  /** `localeIds` is the space's locales in their new order: every one of them, each once. */
  async reorderLocales(spaceId: string, localeIds: string[]) {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        localeIds,
        space.locales.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's locales once");
    }
    return toSpace(await this.spaces.reorderLocales(spaceId, localeIds));
  }

  async setDefaultLocale(spaceId: string, localeId: string) {
    const space = await this.require(spaceId);
    if (!space.locales.some(it => it.id === localeId)) throw new BadRequestException(`Locale ${localeId} is not in space locales`);
    return toSpace(await this.spaces.setDefaultLocale(spaceId, localeId));
  }

  /** Everything in the space goes with it: rows by FK cascade; its stored files are queued and swept right after. */
  async delete(spaceId: string): Promise<void> {
    const space = await this.require(spaceId);
    if (space.importStatus === 'IMPORTING') throw new ConflictException('The space is being imported');
    await this.spaces.delete(spaceId);
    this.sweeper.kick();
  }

  /** Dashboard numbers, computed on request (were stored on the space by the `space-calculateoverview` callable). */
  async overview(spaceId: string): Promise<SpaceOverview> {
    const space = await this.require(spaceId);
    const counts = await this.overviews.counts(spaceId);
    return {
      counts: {
        locales: space.locales.length,
        translations: counts.translations,
        assets: counts.assets.files,
        contents: counts.contents,
        schemas: counts.schemas,
      },
      storage: { assets: counts.assets.size, assetsWithoutSize: counts.assets.withoutSize },
      progress: {
        total: counts.translations,
        locales: space.locales.map(locale => ({ ...locale, translated: counts.translatedBy.get(locale.id) ?? 0 })),
      },
    };
  }

  private async require(spaceId: string): Promise<SpaceRow> {
    const space = await this.spaces.findById(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  private environmentFound(space: SpaceRow | undefined): SpaceRow {
    if (!space) throw new NotFoundException('Environment not found');
    return space;
  }
}
