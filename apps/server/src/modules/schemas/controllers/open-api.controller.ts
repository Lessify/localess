import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { OpenApiService } from '../services/open-api.service.js';

/** OpenAPI document of a space's schemas (was the `openapi-generate` callable). */
@Controller('api/app/spaces/:spaceId/open-api')
export class OpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  @Post()
  @HttpCode(200)
  @RequirePermission(UserPermission.DEV_OPEN_API)
  generate(@Param('spaceId') spaceId: string) {
    return this.openApiService.findOne(spaceId);
  }
}
