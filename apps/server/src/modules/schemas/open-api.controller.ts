import { Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Schema, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { schemas } from '../../infra/database/schema.js';
import { generateOpenApi } from './open-api.service.js';
import { schemaFromRow } from './schema-row.js';
import { requireSpace } from '../../infra/http/space-access.js';

/** OpenAPI document of a space's schemas (was the `openapi-generate` callable). */
@Controller('api/app/spaces/:spaceId/open-api')
export class OpenApiController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Post()
  @HttpCode(200)
  @RequirePermission(UserPermission.DEV_OPEN_API)
  async generate(@Param('spaceId') spaceId: string) {
    await requireSpace(this.db, spaceId);
    const rows = await this.db.select().from(schemas).where(eq(schemas.spaceId, spaceId));
    return generateOpenApi(new Map<string, Schema>(rows.map(row => [row.id, schemaFromRow(row)])));
  }
}
