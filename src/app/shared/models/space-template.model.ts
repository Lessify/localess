import { SchemaComponent, SchemaEnum } from './schema.model';

export type SpaceTemplateId = 'EMPTY' | 'ECOMMERCE' | 'BLOG';

/**
 * A schema as a template declares it: everything but the timestamps, which the server sets.
 *
 * Deliberately NOT `SchemaCreate`. That is `Omit<Schema, 'createdAt' | 'updatedAt'>`, and `Omit` is
 * not distributive over a union - it collapses `SchemaComponent | SchemaEnum` into one object type
 * carrying only the keys the two share, silently dropping `fields`, `values` and `previewField`.
 * Worse, it dissolves the discriminated union, which is what makes a field's shape checkable at
 * all. Omitting from each member separately keeps both.
 */
export type SpaceTemplateComponent = Omit<SchemaComponent, 'createdAt' | 'updatedAt'>;
export type SpaceTemplateEnum = Omit<SchemaEnum, 'createdAt' | 'updatedAt'>;
export type SpaceTemplateSchema = SpaceTemplateComponent | SpaceTemplateEnum;

/**
 * A starting point offered when creating a space.
 *
 * `schemas` is typed rather than loose JSON on purpose. `zod` is not a frontend dependency, so the
 * runtime validation that guards the import path is unavailable here - but TypeScript's
 * discriminated union on `SchemaFieldKind` is a stronger guarantee for repo-authored data and it
 * runs at build time. An OPTION field missing its `source`, or an OPTIONS field given `minValue`
 * instead of `minValues`, simply will not compile.
 *
 * What typing cannot check - that ids referenced across a template resolve - is covered by
 * templates.spec.ts.
 */
export interface SpaceTemplate {
  id: SpaceTemplateId;
  name: string;
  description: string;
  /** An @ng-icons lucide name, registered by whichever component renders it. */
  icon: string;
  schemas: SpaceTemplateSchema[];
}
