import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermission } from '../../auth/decorators.js';
import { UserPermission } from '../../auth/permissions.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { zSchemaExportArraySchema } from '../../domain/models/index.js';
import { toDto } from '../common/dto.js';
import { zLabels } from '../common/zod.js';
import { SchemaRow, SchemasService } from './schemas.service.js';

const schemaId = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Schema ids are letters, digits, - and _');
const createSchema = z.object({ id: schemaId, type: z.enum(['ROOT', 'NODE', 'ENUM']), displayName: z.string().max(200).optional() });
const renameSchema = z.object({ id: schemaId });
const updateSchema = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  labels: zLabels.optional(),
  previewField: z.string().max(200).optional(),
  // Field and value shapes are validated by the editor and by the push/import schemas; stored as given.
  fields: z.array(z.record(z.string(), z.unknown())).optional(),
  values: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});
const templateSchema = z.object({ schemas: zSchemaExportArraySchema });

const dto = (row: SchemaRow) => toDto(row);

/** Schemas (was direct `spaces/{s}/schemas` access from the SPA). */
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
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
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
    @Body(new ZodValidationPipe(templateSchema)) body: z.infer<typeof templateSchema>,
  ) {
    const rows = await this.schemas.createMany(
      spaceId,
      body.schemas.map(schema => ({
        id: schema.id,
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
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return dto(await this.schemas.update(spaceId, id, body));
  }

  @Put(':id/id')
  @RequirePermission(UserPermission.SCHEMA_UPDATE)
  async rename(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
  ) {
    return dto(await this.schemas.rename(spaceId, id, body.id));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.SCHEMA_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.schemas.delete(spaceId, id);
  }
}
