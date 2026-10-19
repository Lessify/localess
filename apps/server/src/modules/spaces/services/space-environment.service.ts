import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Space, SpaceEnvironmentCreate, SpaceEnvironmentUpdate } from '@localess/shared';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { toSpace } from '../../../shared/transformers/space.transformer.js';
import { SpaceEnvironmentRepository } from '../repositories/space-environment.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { isPermutation } from '../utils/permutation.js';

/** A space's environments (the Visual Editor's preview URLs); each change answers the space as it is after. */
@Injectable()
export class SpaceEnvironmentService {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly environments: SpaceEnvironmentRepository,
  ) {}

  /** At the end of the space's list. */
  async create(spaceId: string, environment: SpaceEnvironmentCreate): Promise<Space> {
    await this.require(spaceId);
    return toSpace(await this.environments.create(spaceId, environment));
  }

  async update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Promise<Space> {
    await this.require(spaceId);
    return toSpace(found(await this.environments.update(spaceId, environmentId, environment)));
  }

  async remove(spaceId: string, environmentId: string): Promise<Space> {
    await this.require(spaceId);
    return toSpace(found(await this.environments.delete(spaceId, environmentId)));
  }

  /** `environmentIds` is the space's environments in their new order: every one of them, each once. */
  async reorder(spaceId: string, environmentIds: string[]): Promise<Space> {
    const space = await this.require(spaceId);
    if (
      !isPermutation(
        environmentIds,
        space.environments.map(it => it.id),
      )
    ) {
      throw new BadRequestException("The new order must list each of the space's environments once");
    }
    return toSpace(await this.environments.reorder(spaceId, environmentIds));
  }

  private async require(spaceId: string): Promise<SpaceRow> {
    const space = await this.spaces.findById(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}

function found(space: SpaceRow | undefined): SpaceRow {
  if (!space) throw new NotFoundException('Environment not found');
  return space;
}
