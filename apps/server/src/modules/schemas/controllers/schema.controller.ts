import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { zSchemaCreate, zSchemaRename, zSchemaTypeFilter, zSchemaUpdate } from '@localess/shared/zod';
import { type SchemaCreate, type SchemaRename, SchemaType, type SchemaUpdate, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SchemaService } from '../services/schema.service.js';

/** Schemas (was direct `spaces/{s}/schemas` access from the SPA). `:id` is the UUID; references use `name`. */
@Controller('api/app/spaces/:spaceId/schemas')
export class SchemaController {
  constructor(private readonly schemas: SchemaService) {}

  @Get()
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  findAll(@Param('spaceId') spaceId: string, @Query('type', { schema: zSchemaTypeFilter }) type?: SchemaType) {
    return this.schemas.findAll(spaceId, type);
  }

  @Get(':id')
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.schemas.findOne(spaceId, id);
  }

  @Get(':id/usage')
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  findUsage(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.schemas.findUsage(spaceId, id);
  }

  @Post()
  @RequirePermission(UserPermission.SCHEMA_CREATE)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSchemaCreate }) body: SchemaCreate) {
    return this.schemas.create(spaceId, body);
  }

  @Put(':id')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zSchemaUpdate }) body: SchemaUpdate,
  ) {
    return this.schemas.update(spaceId, id, body);
  }

  @Put(':id/name')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  rename(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zSchemaRename }) body: SchemaRename,
  ) {
    return this.schemas.rename(spaceId, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.SCHEMA_DELETE)
  remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    return this.schemas.remove(spaceId, id);
  }
}
