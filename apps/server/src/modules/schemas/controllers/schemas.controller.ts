import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { SchemaType, UserPermission } from '@localess/shared';
import { schemaEnumValueSchema, schemaFieldSchema, zSchemaTemplateSchema } from '@localess/shared/zod';
import { RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { zLabels } from '../../../infra/http/zod.js';
import { SchemasService } from '../services/schemas.service.js';

const schemaName = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Schema names are letters, digits, - and _');
const createSchema = z.object({ name: schemaName, type: z.enum(['ROOT', 'NODE', 'ENUM']), displayName: z.string().max(200).optional() });
const renameSchema = z.object({ name: schemaName });
const updateSchema = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  labels: zLabels.optional(),
  previewField: z.string().max(200).optional(),
  // The shapes the push and the imports check too; keys a field kind does not have are dropped.
  fields: z.array(schemaFieldSchema).optional(),
  values: z.array(schemaEnumValueSchema).optional(),
});

/** Schemas (was direct `spaces/{s}/schemas` access from the SPA). `:id` is the UUID; references use `name`. */
@Controller('api/app/spaces/:spaceId/schemas')
export class SchemasController {
  constructor(private readonly schemas: SchemasService) {}

  @Get()
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  list(@Param('spaceId') spaceId: string, @Query('type', new ZodValidationPipe(z.enum(SchemaType).optional())) type?: SchemaType) {
    return this.schemas.list(spaceId, type);
  }

  @Get(':id')
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.schemas.get(spaceId, id);
  }

  @Post()
  @RequirePermission(UserPermission.SCHEMA_CREATE)
  create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.schemas.create(spaceId, body);
  }

  /** Applies a space template's schemas in one transaction. */
  @Post('template')
  @RequirePermission(UserPermission.SCHEMA_CREATE)
  applyTemplate(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(zSchemaTemplateSchema)) body: z.infer<typeof zSchemaTemplateSchema>,
  ) {
    return this.schemas.createMany(
      spaceId,
      // Templates are in the export format, where `id` is the name.
      body.schemas.map(schema => ({
        name: schema.id,
        type: schema.type,
        displayName: schema.displayName,
        description: schema.description,
        labels: schema.labels,
        previewField: 'previewField' in schema ? schema.previewField : undefined,
        fields: 'fields' in schema ? schema.fields : undefined,
        values: 'values' in schema ? schema.values : undefined,
      })),
    );
  }

  @Put(':id')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return this.schemas.update(spaceId, id, body);
  }

  @Put(':id/name')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  rename(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
  ) {
    return this.schemas.rename(spaceId, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.SCHEMA_DELETE)
  delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    return this.schemas.delete(spaceId, id);
  }
}
