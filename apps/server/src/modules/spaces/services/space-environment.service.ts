import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { IdNameUrl, Page, SpaceEnvironment, SpaceEnvironmentCreate, SpaceEnvironmentOrder, SpaceEnvironmentPageable, SpaceEnvironmentUpdate } from '@localess/shared';
import { toSpaceEnvironment } from '../../../shared/transformers/space.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { SpaceEnvironmentRepository } from '../repositories/space-environment.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { isPermutation } from '../utils/permutation.js';

/**
 * A space's environments (the Visual Editor's preview URLs; the first is the default). Adding and updating answer the
 * environment; removing and reordering answer nothing (a `spaces` event follows).
 */
@Injectable()
export class SpaceEnvironmentService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceEnvironmentRepository: SpaceEnvironmentRepository,
  ) {}

  /** One page; in the space's order unless sorted otherwise. */
  async findAll(spaceId: string, query: SpaceEnvironmentPageable): Promise<Page<SpaceEnvironment>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.spaceEnvironmentRepository.findAll(spaceId, query),
      this.spaceEnvironmentRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toSpaceEnvironment);
  }

  /** Every environment of the space, in its order, with its URL (what the Visual Editor previews with). */
  async findAllNames(spaceId: string): Promise<IdNameUrl[]> {
    await this.requireSpace(spaceId);
    return this.spaceEnvironmentRepository.findAllNames(spaceId);
  }

  /** At the end of the space's list. */
  async create(spaceId: string, environment: SpaceEnvironmentCreate): Promise<SpaceEnvironment> {
    await this.requireSpace(spaceId);
    const environmentId = await this.spaceEnvironmentRepository.create(spaceId, environment);
    return toSpaceEnvironment(await this.findEnvironment(spaceId, environmentId));
  }

  async update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Promise<SpaceEnvironment> {
    await this.requireEnvironment(spaceId, environmentId);
    await this.spaceEnvironmentRepository.update(spaceId, environmentId, environment);
    return toSpaceEnvironment(await this.findEnvironment(spaceId, environmentId));
  }

  async remove(spaceId: string, environmentId: string): Promise<void> {
    await this.requireEnvironment(spaceId, environmentId);
    await this.spaceEnvironmentRepository.delete(spaceId, environmentId);
  }

  /** `order.ids` is the space's environments in their new order: every one of them, each once. */
  async reorder(spaceId: string, order: SpaceEnvironmentOrder): Promise<void> {
    const environmentIds = order.ids;
    await this.requireSpace(spaceId);
    const current = await this.spaceEnvironmentRepository.findAllNames(spaceId);
    if (
      !isPermutation(
        environmentIds,
        current.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's environments once");
    }
    await this.spaceEnvironmentRepository.reorder(spaceId, environmentIds);
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }

  /** The space first: its 404 comes before the environment's. */
  private async requireEnvironment(spaceId: string, environmentId: string) {
    await this.requireSpace(spaceId);
    return this.findEnvironment(spaceId, environmentId);
  }

  /** The environment alone, the space already checked (the re-read after a write). */
  private async findEnvironment(spaceId: string, environmentId: string) {
    const environment = await this.spaceEnvironmentRepository.findOne(spaceId, environmentId);
    if (!environment) throw new NotFoundException('Environment not found');
    return environment;
  }
}
