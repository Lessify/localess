import { ANY_ROLE, DEVELOPERS, type SchemaCreate, type SchemaRename, SchemaType, type SchemaUpdate } from '@localess/shared';
import { zSchemaCreate, zSchemaRename, zSchemaTypeFilter, zSchemaUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SchemaService } from '../services/schema.service.js';

/** Schemas (was direct `spaces/{s}/schemas` access from the SPA). `:id` is the UUID; references use `name`. */
@Controller('api/app/spaces/:spaceId/schemas')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get()
  @RequireRole(ANY_ROLE)
  findAll(@Param('spaceId') spaceId: string, @Query('type', { schema: zSchemaTypeFilter }) type?: SchemaType) {
    return this.schemaService.findAll(spaceId, type);
  }

  @Get(':id')
  @RequireRole(ANY_ROLE)
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.schemaService.findOne(spaceId, id);
  }

  @Get(':id/usage')
  @RequireRole(ANY_ROLE)
  findUsage(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.schemaService.findUsage(spaceId, id);
  }

  @Post()
  @RequireRole(DEVELOPERS)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSchemaCreate }) body: SchemaCreate) {
    return this.schemaService.create(spaceId, body);
  }

  @Put(':id')
  @RequireRole(DEVELOPERS)
  update(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Body({ schema: zSchemaUpdate }) body: SchemaUpdate) {
    return this.schemaService.update(spaceId, id, body);
  }

  @Put(':id/name')
  @RequireRole(DEVELOPERS)
  rename(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Body({ schema: zSchemaRename }) body: SchemaRename) {
    return this.schemaService.rename(spaceId, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireRole(DEVELOPERS)
  remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    return this.schemaService.remove(spaceId, id);
  }
}
