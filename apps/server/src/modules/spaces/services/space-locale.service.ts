import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Space } from '@localess/shared';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { toSpace } from '../../../shared/transformers/space.transformer.js';
import { LocaleRepository } from '../repositories/locale.repository.js';
import { SpaceLocaleRepository } from '../repositories/space-locale.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { isPermutation } from '../utils/permutation.js';

/** A space's locales and its default locale; each change answers the space as it is after (with its locales). */
@Injectable()
export class SpaceLocaleService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceLocaleRepository: SpaceLocaleRepository,
    private readonly localeRepository: LocaleRepository,
  ) {}

  /** Adds a locale from `locales` at the end of the space's list (no-op when it is already there, like `arrayUnion`). */
  async create(spaceId: string, localeId: string): Promise<Space> {
    const space = await this.require(spaceId);
    if (space.spaceLocales.some(it => it.localeId === localeId)) return toSpace(space);
    if (!(await this.localeRepository.exists(localeId))) throw new BadRequestException(`Unknown locale ${localeId}`);
    await this.spaceLocaleRepository.create(spaceId, localeId);
    return this.reread(spaceId);
  }

  async remove(spaceId: string, localeId: string): Promise<Space> {
    const space = await this.require(spaceId);
    if (space.defaultLocaleId === localeId) {
      throw new BadRequestException('The default locale cannot be removed; make another locale the default first');
    }
    await this.spaceLocaleRepository.delete(spaceId, localeId);
    return this.reread(spaceId);
  }

  /** `localeIds` is the space's locales in their new order: every one of them, each once. */
  async reorder(spaceId: string, localeIds: string[]): Promise<Space> {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        localeIds,
        space.spaceLocales.map(it => it.localeId),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's locales once");
    }
    await this.spaceLocaleRepository.reorder(spaceId, localeIds);
    return this.reread(spaceId);
  }

  async setDefault(spaceId: string, localeId: string): Promise<Space> {
    const space = await this.require(spaceId);
    if (!space.spaceLocales.some(it => it.localeId === localeId)) throw new BadRequestException(`Locale ${localeId} is not in space locales`);
    await this.spaceLocaleRepository.setDefault(spaceId, localeId);
    return this.reread(spaceId);
  }

  private async require(spaceId: string): Promise<SpaceWithLocales> {
    const space = await this.spaceRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  private async reread(spaceId: string): Promise<Space> {
    return toSpace(await this.require(spaceId));
  }
}
