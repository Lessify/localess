import { Injectable, NotFoundException } from '@nestjs/common';
import type { Schema, SchemaExport, SchemaType } from '@localess/shared';
import { schemasByName, toSchema } from '../../../shared/transformers/schema.transformer.js';
import { docSchemaToExport, planSchemaPush, type SchemaPushPlan } from '../../../shared/utils/schema.utils.js';
import { type NewSchema, type SchemaColumns, type SchemaEntity, SchemasRepository } from '../repositories/schemas.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';

function found(entity: SchemaEntity | undefined): Schema {
  if (!entity) throw new NotFoundException('Schema not found');
  return toSchema(entity);
}

/**
 * Schemas of a space. Routes use the UUID `id`; `name` is what content and fields refer to, unique per space.
 * Every write bumps the content version: drafts are rendered through schemas (the repository does it in the write's
 * transaction).
 */
@Injectable()
export class SchemasService {
  constructor(
    private readonly schemas: SchemasRepository,
    private readonly spaces: SpaceRepository,
  ) {}

  async list(spaceId: string, type?: SchemaType): Promise<Schema[]> {
    return (await this.schemas.findAll(spaceId, type)).map(toSchema);
  }

  async get(spaceId: string, id: string): Promise<Schema> {
    return found(await this.schemas.findById(spaceId, id));
  }

  async create(spaceId: string, input: NewSchema): Promise<Schema> {
    return toSchema(await this.schemas.create(spaceId, input));
  }

  /** Several schemas at once, all or nothing (was the space-template `writeBatch`). */
  async createMany(spaceId: string, inputs: NewSchema[]): Promise<Schema[]> {
    return (await this.schemas.createMany(spaceId, inputs)).map(toSchema);
  }

  /** Replaces the editable fields; absent ones are cleared (the UI's `deleteField()`). */
  async update(spaceId: string, id: string, input: Omit<SchemaColumns, 'type'>): Promise<Schema> {
    const entity = await this.schemas.update(spaceId, id, {
      displayName: input.displayName || null,
      description: input.description || null,
      labels: input.labels?.length ? input.labels : null,
      previewField: input.previewField || null,
      fields: input.fields ?? null,
      values: input.values ?? null,
    });
    return found(entity);
  }

  /**
   * Changes the name; the id stays. Content and fields referring to the old name are not rewritten (as before):
   * they keep the old name until edited.
   */
  async rename(spaceId: string, id: string, name: string): Promise<Schema> {
    return found(await this.schemas.rename(spaceId, id, name));
  }

  async delete(spaceId: string, id: string): Promise<void> {
    if (!(await this.schemas.delete(spaceId, id))) throw new NotFoundException('Schema not found');
  }

  // The public API (developers and the CLI) addresses schemas by name; `undefined` when the space is not there.

  /** The schema export, in byte order of the name. */
  async export(spaceId: string): Promise<SchemaExport[] | undefined> {
    if (!(await this.spaces.find(spaceId))) return undefined;
    return (await this.schemas.findAllInByteOrder(spaceId)).map(entity => docSchemaToExport(entity.name, toSchema(entity)));
  }

  /** What a push would change, with the referential-integrity errors that block it. */
  async planPush(spaceId: string, pushed: SchemaExport[], type: 'upsert' | 'sync'): Promise<SchemaPushPlan | undefined> {
    if (!(await this.spaces.find(spaceId))) return undefined;
    return planSchemaPush(schemasByName(await this.schemas.findAllInByteOrder(spaceId)), pushed, type);
  }

  applyPush(spaceId: string, plan: SchemaPushPlan): Promise<void> {
    return this.schemas.applyPushPlan(spaceId, plan);
  }
}
