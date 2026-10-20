import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { IdName, Page, SpaceLocale, SpaceLocaleCreate, SpaceLocaleMove, SpaceLocalePageable } from '@localess/shared';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { toSpaceLocale } from '../../../shared/transformers/space.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { LocaleRepository } from '../repositories/locale.repository.js';
import { SpaceLocaleRepository } from '../repositories/space-locale.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';

/**
 * A space's locales and its default locale. Adding answers the space locale; removing and moving answer nothing (a
 * `spaces` event follows); setting the default answers the space, whose `defaultLocaleId` it changed.
 */
@Injectable()
export class SpaceLocaleService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceLocaleRepository: SpaceLocaleRepository,
    private readonly localeRepository: LocaleRepository,
  ) {}

  /** One page, each with its locale; in the space's order unless sorted otherwise. */
  async findAll(spaceId: string, query: SpaceLocalePageable): Promise<Page<SpaceLocale>> {
    await this.requireExists(spaceId);
    const [rows, total] = await Promise.all([
      this.spaceLocaleRepository.findAll(spaceId, query),
      this.spaceLocaleRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toSpaceLocale);
  }

  /** Every locale of the space, in its order. */
  async findAllNames(spaceId: string): Promise<IdName[]> {
    await this.requireExists(spaceId);
    return this.spaceLocaleRepository.findAllNames(spaceId);
  }

  /** Adds a locale from `locales` at the end of the space's list (no-op when it is already there, like `arrayUnion`). */
  async create(spaceId: string, { localeId }: SpaceLocaleCreate): Promise<SpaceLocale> {
    const space = await this.require(spaceId);
    if (!space.spaceLocales.some(it => it.localeId === localeId)) {
      if (!(await this.localeRepository.exists(localeId))) throw new BadRequestException(`Unknown locale ${localeId}`);
      await this.spaceLocaleRepository.create(spaceId, localeId);
    }
    const created = await this.spaceLocaleRepository.findOne(spaceId, localeId);
    if (!created) throw new NotFoundException('Space locale not found');
    return toSpaceLocale(created);
  }

  async remove(spaceId: string, localeId: string): Promise<void> {
    const space = await this.require(spaceId);
    if (!space.spaceLocales.some(it => it.localeId === localeId)) throw new NotFoundException('Space locale not found');
    if (space.defaultLocaleId === localeId) {
      throw new BadRequestException('The default locale cannot be removed; make another locale the default first');
    }
    await this.spaceLocaleRepository.delete(spaceId, localeId);
  }

  /** To `move.position` in the space's order (0 the first; past the end, the last), the others shifting. */
  async move(spaceId: string, localeId: string, move: SpaceLocaleMove): Promise<void> {
    await this.requireExists(spaceId);
    if (!(await this.spaceLocaleRepository.findOne(spaceId, localeId))) throw new NotFoundException('Space locale not found');
    await this.spaceLocaleRepository.move(spaceId, localeId, move.position);
  }

  private async requireExists(spaceId: string): Promise<void> {
    if (!(await this.spaceRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }

  private async require(spaceId: string): Promise<SpaceWithLocales> {
    const space = await this.spaceRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}
