import { Injectable, NotFoundException } from '@nestjs/common';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { SchemaRepository } from '../repositories/schema.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { generateOpenApi } from '../utils/open-api.js';

/** The OpenAPI document of a space's schemas, for the app (was the `openapi-generate` callable) and the public API. */
@Injectable()
export class OpenApiService {
  constructor(
    private readonly schemas: SchemaRepository,
    private readonly spaces: SpaceRepository,
  ) {}

  /** `undefined` when the space is not there. */
  async find(spaceId: string): Promise<OpenAPIObject | undefined> {
    if (!(await this.spaces.find(spaceId))) return undefined;
    return generateOpenApi(schemasByName(await this.schemas.findAllInByteOrder(spaceId)));
  }

  async findOne(spaceId: string): Promise<OpenAPIObject> {
    const document = await this.find(spaceId);
    if (!document) throw new NotFoundException('Space not found');
    return document;
  }
}
