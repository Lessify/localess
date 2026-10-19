import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SpaceEnvironment, SpaceEnvironmentCreate, SpaceEnvironmentUpdate } from '@localess/shared';
import { toSpaceEnvironment } from '../../../shared/transformers/space.transformer.js';
import { SpaceEnvironmentRepository } from '../repositories/space-environment.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { isPermutation } from '../utils/permutation.js';

/** A space's environments (the Visual Editor's preview URLs); each change answers the space's environments after it. */
@Injectable()
export class SpaceEnvironmentService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceEnvironmentRepository: SpaceEnvironmentRepository,
  ) {}

  /** In position order. */
  async findAll(spaceId: string): Promise<SpaceEnvironment[]> {
    await this.requireSpace(spaceId);
    return this.list(spaceId);
  }

  /** At the end of the space's list. */
  async create(spaceId: string, environment: SpaceEnvironmentCreate): Promise<SpaceEnvironment[]> {
    await this.requireSpace(spaceId);
    await this.spaceEnvironmentRepository.create(spaceId, environment);
    return this.list(spaceId);
  }

  async update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Promise<SpaceEnvironment[]> {
    await this.requireEnvironment(spaceId, environmentId);
    await this.spaceEnvironmentRepository.update(spaceId, environmentId, environment);
    return this.list(spaceId);
  }

  async remove(spaceId: string, environmentId: string): Promise<SpaceEnvironment[]> {
    await this.requireEnvironment(spaceId, environmentId);
    await this.spaceEnvironmentRepository.delete(spaceId, environmentId);
    return this.list(spaceId);
  }

  /** `environmentIds` is the space's environments in their new order: every one of them, each once. */
  async reorder(spaceId: string, environmentIds: string[]): Promise<SpaceEnvironment[]> {
    await this.requireSpace(spaceId);
    const current = await this.spaceEnvironmentRepository.findAll(spaceId);
    if (
      !isPermutation(
        environmentIds,
        current.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's environments once");
    }
    await this.spaceEnvironmentRepository.reorder(spaceId, environmentIds);
    return this.list(spaceId);
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceRepository.findOne(spaceId))) throw new NotFoundException('Space not found');
  }

  private async requireEnvironment(spaceId: string, environmentId: string): Promise<void> {
    await this.requireSpace(spaceId);
    if (!(await this.spaceEnvironmentRepository.findOne(spaceId, environmentId))) throw new NotFoundException('Environment not found');
  }

  private async list(spaceId: string): Promise<SpaceEnvironment[]> {
    return (await this.spaceEnvironmentRepository.findAll(spaceId)).map(toSpaceEnvironment);
  }
}
