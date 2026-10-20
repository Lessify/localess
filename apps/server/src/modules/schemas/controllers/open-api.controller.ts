import { DEVELOPERS } from '@localess/shared';
import { Controller, HttpCode, Param, Post } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { OpenApiService } from '../services/open-api.service.js';

/** OpenAPI document of a space's schemas (was the `openapi-generate` callable). */
@Controller('api/app/spaces/:spaceId/open-api')
export class OpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  @Post()
  @HttpCode(200)
  @RequireRole(DEVELOPERS)
  generate(@Param('spaceId') spaceId: string) {
    return this.openApiService.findOne(spaceId);
  }
}
