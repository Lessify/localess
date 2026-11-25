import { DEVELOPERS } from '@localess/shared';
import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { OpenAPIObject } from 'openapi3-ts/oas30';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { OpenApiService } from '../services/open-api.service.js';

/** OpenAPI document of a space's schemas (was the `openapi-generate` callable). */
@Controller('api/app/spaces/:spaceId/open-api')
export class OpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  @Post()
  @HttpCode(200)
  @RequireRole(DEVELOPERS)
  generate(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<OpenAPIObject> {
    return this.openApiService.findOne(spaceId);
  }
}
