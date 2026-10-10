import { SchemaComponentExport, SchemaEnumExport } from '@localess/shared';

export type SpaceTemplateId = 'EMPTY' | 'ECOMMERCE' | 'BLOG' | 'MARKETING';

/**
 * A schema as a template declares it: the export format, where `id` is the schema's name (as in exports, the SDK
 * and Code as Source); the server gives each one a UUID.
 *
 * Kept per member rather than one `Omit` over the `Schema` union: `Omit` is not distributive, so it would collapse
 * `SchemaComponent | SchemaEnum` into the keys the two share, dropping `fields`, `values` and `previewField` and
 * dissolving the discriminated union that makes a field's shape checkable at all.
 */
export type SpaceTemplateComponent = SchemaComponentExport;
export type SpaceTemplateEnum = SchemaEnumExport;
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
