import {
  ANY_ROLE,
  DEVELOPERS,
  type Schema,
  type SchemaCreate,
  type SchemaRename,
  SchemaType,
  type SchemaUpdate,
  type SchemaUsage,
} from '@localess/shared';
import { zSchemaCreate, zSchemaRename, zSchemaTypeFilter, zSchemaUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SchemaService } from '../services/schema.service.js';

/** Schemas of a space. `:schemaId` is the UUID; content and fields refer to a schema by `name`. */
@Controller('api/app/spaces/:spaceId/schemas')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get()
  @RequireRole(ANY_ROLE)
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query('type', { schema: zSchemaTypeFilter }) type?: SchemaType,
  ): Promise<Schema[]> {
    return this.schemaService.findAll(spaceId, type);
  }

  @Get(':schemaId')
  @RequireRole(ANY_ROLE)
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('schemaId', UuidParamPipe) schemaId: string): Promise<Schema> {
    return this.schemaService.findOne(spaceId, schemaId);
  }

  @Get(':schemaId/usage')
  @RequireRole(ANY_ROLE)
  findUsage(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('schemaId', UuidParamPipe) schemaId: string): Promise<SchemaUsage> {
    return this.schemaService.findUsage(spaceId, schemaId);
  }

  @Post()
  @RequireRole(DEVELOPERS)
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zSchemaCreate }) body: SchemaCreate): Promise<Schema> {
    return this.schemaService.create(spaceId, body);
  }

  @Put(':schemaId')
  @RequireRole(DEVELOPERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('schemaId', UuidParamPipe) schemaId: string,
    @Body({ schema: zSchemaUpdate }) body: SchemaUpdate,
  ): Promise<Schema> {
    return this.schemaService.update(spaceId, schemaId, body);
  }

  @Put(':schemaId/name')
  @RequireRole(DEVELOPERS)
  rename(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('schemaId', UuidParamPipe) schemaId: string,
    @Body({ schema: zSchemaRename }) body: SchemaRename,
  ): Promise<Schema> {
    return this.schemaService.rename(spaceId, schemaId, body.name);
  }

  @Delete(':schemaId')
  @HttpCode(204)
  @RequireRole(DEVELOPERS)
  remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('schemaId', UuidParamPipe) schemaId: string): Promise<void> {
    return this.schemaService.remove(spaceId, schemaId);
  }
}
