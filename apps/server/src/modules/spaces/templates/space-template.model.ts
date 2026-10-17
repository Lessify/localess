import type { SchemaComponentExport, SchemaEnumExport } from '@localess/shared';

/**
 * A schema as a template declares it: the export format, where `id` is the schema's name (as in exports, the SDK and
 * Code as Source); the space gets it with a new UUID.
 *
 * Kept per member rather than one `Omit` over the `Schema` union: `Omit` is not distributive, so it would collapse
 * `SchemaComponent | SchemaEnum` into the keys the two share, dropping `fields`, `values` and `previewField`.
 */
export type SpaceTemplateComponent = SchemaComponentExport;
export type SpaceTemplateEnum = SchemaEnumExport;
export type SpaceTemplateSchema = SpaceTemplateComponent | SpaceTemplateEnum;

/** A translation as a template writes it: values by locale id, as stored. */
export interface TemplateTranslation {
  key: string;
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
}

/**
 * A starting point offered when creating a space, written in the creating transaction (`SpaceTemplatesRepository`).
 * Typed data rather than loose JSON: a field missing its `source`, or given the wrong limit, does not compile; what
 * typing can not check (references resolve) is covered by templates.test.ts.
 */
export interface SpaceTemplate {
  id: string;
  name: string;
  description: string;
  /** An @ng-icons lucide name, registered by the Create Space dialog. */
  icon: string;
  /** Offered only with LOCALESS_TEST_TEMPLATES (development and e2e). */
  test?: boolean;
  /** Locale ids added after the default locale (English), in this order. */
  locales?: string[];
  schemas: SpaceTemplateSchema[];
  /** Pure: the same output on every call (e2e tests depend on it). */
  translations?: () => TemplateTranslation[];
}
