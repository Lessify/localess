import { type Schema, type SchemaExport, type SchemaField, SchemaType, type SchemaUsage } from '@localess/shared';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { SchemaEntity } from '../../../shared/entities/schema.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { schemasByName, toSchema } from '../../../shared/transformers/schema.transformer.js';
import { checkSchemaFields, docSchemaToExport, planSchemaPush, type SchemaPushPlan } from '../../../shared/utils/schema.utils.js';
import { type NewSchema, type SchemaColumns, SchemaRepository } from '../repositories/schema.repository.js';

/** "Schema 'card' is in use: referenced by 'page' field 'items'; used by 6 contents: Home (home), … and 1 more". */
function inUseMessage(name: string, usage: SchemaUsage): string {
  const parts: string[] = [];
  if (usage.fields.length) parts.push(`referenced by ${usage.fields.map(it => `'${it.schema}' field '${it.field}'`).join(', ')}`);
  const { count, first } = usage.contents;
  if (count) {
    const more = count > first.length ? ` and ${count - first.length} more` : '';
    parts.push(
      `used by ${count} ${count === 1 ? 'content' : 'contents'}: ${first.map(it => `${it.name} (${it.fullSlug})`).join(', ')}${more}`,
    );
  }
  return `Schema '${name}' is in use: ${parts.join('; ')}`;
}

/** The push's refusal for schemas that contents use as their document schema. */
function contentErrors(counts: Map<string, number>): string[] {
  return [...counts].map(([name, value]) => `Cannot delete schema '${name}': used by ${value} ${value === 1 ? 'content' : 'contents'}`);
}

/** For schemas a write refers to that went since the service checked them. */
function lostMessage(lost: string[]): string {
  return `${lost.length === 1 ? 'Schema' : 'Schemas'} ${lost.map(it => `'${it}'`).join(', ')} ${lost.length === 1 ? 'was' : 'were'} renamed or deleted meanwhile`;
}

/** Refuses (400) the schemas whose fields break a rule across fields, saying which. */
function requireValidFields(
  schemas: { name: string; type: SchemaType | `${SchemaType}`; previewField?: string | null; fields?: SchemaField[] | null }[],
  types: ReadonlyMap<string, SchemaType>,
): void {
  const invalid = schemas
    .filter(it => it.type !== SchemaType.ENUM)
    .map(it => ({ name: it.name, problems: checkSchemaFields(it, types) }))
    .filter(it => it.problems.length);
  if (invalid.length)
    throw new BadRequestException(invalid.map(it => `Schema '${it.name}' is not valid: ${it.problems.join('; ')}`).join('. '));
}

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
export class SchemaService {
  constructor(
    private readonly schemaRepository: SchemaRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  async findAll(spaceId: string, type?: SchemaType): Promise<Schema[]> {
    await this.requireSpace(spaceId);
    return (await this.schemaRepository.findAll(spaceId, type)).map(toSchema);
  }

  async findOne(spaceId: string, schemaId: string): Promise<Schema> {
    return this.requireSchema(spaceId, schemaId);
  }

  /** What uses the schema by name: while anything does, it can be neither renamed nor deleted. */
  async findUsage(spaceId: string, schemaId: string): Promise<SchemaUsage> {
    return this.schemaRepository.usage(spaceId, (await this.requireSchema(spaceId, schemaId)).name);
  }

  async create(spaceId: string, input: NewSchema): Promise<Schema> {
    await this.requireSpace(spaceId);
    return toSchema(await this.schemaRepository.create(spaceId, input));
  }

  /**
   * Replaces the editable fields; absent ones are cleared (the UI's `deleteField()`). Only what the schema's type has
   * is stored: fields and the preview field for ROOT and NODE, values for ENUM (the type never changes). The fields
   * must keep the rules across fields (400, saying which); the schemas they refer to stay locked until the write
   * commits.
   */
  async update(spaceId: string, schemaId: string, input: Omit<SchemaColumns, 'type'>): Promise<Schema> {
    const { name, type } = await this.requireSchema(spaceId, schemaId);
    const component = type !== SchemaType.ENUM;
    const values = {
      displayName: input.displayName || null,
      description: input.description || null,
      labels: input.labels?.length ? input.labels : null,
      previewField: (component && input.previewField) || null,
      fields: (component && input.fields) || null,
      values: (!component && input.values) || null,
    };
    requireValidFields([{ name, type, ...values }], await this.types(spaceId));
    const outcome = await this.schemaRepository.update(spaceId, schemaId, values);
    if (!outcome) throw new NotFoundException('Schema not found');
    if (outcome.lost) throw new ConflictException(lostMessage(outcome.lost));
    return toSchema(outcome.schema!);
  }

  /**
   * Changes the name; the id stays. Refused (409, saying where) while the schema is in use: the fields of other schemas
   * and the contents refer to it by name, and are not rewritten. The repository checks and writes under the row's lock.
   */
  async rename(spaceId: string, schemaId: string, name: string): Promise<Schema> {
    const current = await this.requireSchema(spaceId, schemaId);
    const outcome = await this.schemaRepository.rename(spaceId, schemaId, name);
    if (!outcome) throw new NotFoundException('Schema not found');
    if (outcome.inUse) throw new ConflictException(inUseMessage(current.name, outcome.inUse));
    return toSchema(outcome.schema!);
  }

  /** Refused (409, saying where) while the schema is in use, as a rename. */
  async remove(spaceId: string, schemaId: string): Promise<void> {
    const current = await this.requireSchema(spaceId, schemaId);
    const outcome = await this.schemaRepository.delete(spaceId, schemaId);
    if (!outcome) throw new NotFoundException('Schema not found');
    if (outcome.inUse) throw new ConflictException(inUseMessage(current.name, outcome.inUse));
  }

  // The public API (developers and the CLI) addresses schemas by name; `undefined` when the space is not there.

  /** The schema export, in byte order of the name. */
  async export(spaceId: string): Promise<SchemaExport[] | undefined> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) return undefined;
    return (await this.schemaRepository.findAllInByteOrder(spaceId)).map(entity => docSchemaToExport(entity.name, toSchema(entity)));
  }

  /**
   * What a push would change, with the errors that block it: a sync may delete neither a schema the pushed fields
   * refer to nor one contents use as their document schema.
   */
  async planPush(spaceId: string, pushed: SchemaExport[], type: 'upsert' | 'sync'): Promise<SchemaPushPlan | undefined> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) return undefined;
    const plan = planSchemaPush(schemasByName(await this.schemaRepository.findAllInByteOrder(spaceId)), pushed, type);
    plan.errors.push(...contentErrors(await this.schemaRepository.countContentsBySchema(spaceId, plan.deletes)));
    return plan;
  }

  /**
   * The errors when the plan no longer holds (nothing is written then): contents took a schema it deletes, or a schema
   * its fields refer to went, since it was planned.
   */
  async applyPush(spaceId: string, plan: SchemaPushPlan): Promise<string[]> {
    const { usedByContents, lost } = await this.schemaRepository.applyPushPlan(spaceId, plan);
    return [...contentErrors(usedByContents), ...(lost.length ? [lostMessage(lost)] : [])];
  }

  /** 404 "Space not found" when the space is not there: every App API route checks it first. */
  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }

  /** The space first, then its schema (404 "Schema not found", also for a schema of another space). */
  private async requireSchema(spaceId: string, schemaId: string): Promise<Schema> {
    await this.requireSpace(spaceId);
    return found(await this.schemaRepository.findById(spaceId, schemaId));
  }

  /** Every schema of the space by name, with its type. */
  private async types(spaceId: string): Promise<Map<string, SchemaType>> {
    return new Map((await this.schemaRepository.findAll(spaceId)).map(it => [it.name, it.type as SchemaType]));
  }
}
