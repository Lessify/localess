import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { zSchemaTemplateSchema } from '@localess/shared/zod';
import { RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { toDto } from '../../infra/http/dto.js';
import { UuidParamPipe } from '../../infra/http/uuid-param.pipe.js';
import { zLabels } from '../../infra/http/zod.js';
import { SchemaRow, SchemasService } from './schemas.service.js';

const schemaName = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Schema names are letters, digits, - and _');
const createSchema = z.object({ name: schemaName, type: z.enum(['ROOT', 'NODE', 'ENUM']), displayName: z.string().max(200).optional() });
const renameSchema = z.object({ name: schemaName });
const updateSchema = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  labels: zLabels.optional(),
  previewField: z.string().max(200).optional(),
  // Field and value shapes are validated by the editor and by the push/import schemas; stored as given.
  fields: z.array(z.record(z.string(), z.unknown())).optional(),
  values: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});

const dto = (row: SchemaRow) => toDto(row);

/** Schemas (was direct `spaces/{s}/schemas` access from the SPA). `:id` is the UUID; references use `name`. */
@Controller('api/app/spaces/:spaceId/schemas')
export class SchemasController {
  constructor(private readonly schemas: SchemasService) {}

  @Get()
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query('type') type?: string) {
    return (await this.schemas.list(spaceId, type)).map(dto);
  }

  @Get(':id')
  @RequirePermission(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return dto(await this.schemas.get(spaceId, id));
  }

  @Post()
  @RequirePermission(UserPermission.SCHEMA_CREATE)
  async create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return dto(await this.schemas.create(spaceId, body));
  }

  /** Applies a space template's schemas in one transaction. */
  @Post('template')
  @RequirePermission(UserPermission.SCHEMA_CREATE)
  async applyTemplate(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(zSchemaTemplateSchema)) body: z.infer<typeof zSchemaTemplateSchema>,
  ) {
    const rows = await this.schemas.createMany(
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
    return rows.map(dto);
  }

  @Put(':id')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return dto(await this.schemas.update(spaceId, id, body));
  }

  @Put(':id/name')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  async rename(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
  ) {
    return dto(await this.schemas.rename(spaceId, id, body.name));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.SCHEMA_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.schemas.delete(spaceId, id);
  }
}
