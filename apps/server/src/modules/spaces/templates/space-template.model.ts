import type { ContentValue, SchemaComponentExport, SchemaEnumExport, SpaceTemplateId } from '@localess/shared';

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
 * An asset a template creates: a folder, or a file whose bytes it generates (the same bytes every time). `parent` and
 * the keys other items use are template keys, mapped to the new ids when the space is created.
 */
export interface TemplateAsset {
  key: string;
  kind: 'FOLDER' | 'FILE';
  name: string;
  /** Key of a FOLDER of the same template; none: at the root. */
  parent?: string;
  /** `metadata`: known from the generator (stored as is, not read back from the file); none: read as for an upload. */
  file?: { extension: string; type: string; bytes: () => Promise<Buffer>; metadata?: Record<string, unknown> };
}

/**
 * A folder or document a template creates. `data` gets `id(key)` for the ids of the template's contents and assets, and
 * returns the document's fields (its `_id` and `_schema` are added when it is written); blocks carry their own `_id`.
 */
export interface TemplateContent {
  key: string;
  kind: 'FOLDER' | 'DOCUMENT';
  name: string;
  slug: string;
  /** Key of a FOLDER of the same template; none: at the root. */
  parent?: string;
  schema?: string;
  data?: (id: (key: string) => string) => Record<string, ContentValue>;
}

/**
 * A starting point offered when creating a space, written in the creating transaction (`SpaceTemplatesRepository`).
 * Typed data rather than loose JSON: a field missing its `source`, or given the wrong limit, does not compile; what
 * typing can not check (references resolve) is covered by templates.test.ts.
 */
export interface SpaceTemplate {
  /** Its title, description and icon are the web app's (the Create Space dialog). */
  id: SpaceTemplateId;
  /** Offered only with LOCALESS_TEST_TEMPLATES (development and e2e). */
  test?: boolean;
  /** Locale ids added after the default locale (English), in this order. */
  locales?: string[];
  schemas: SpaceTemplateSchema[];
  /** Pure: the same output on every call (e2e tests depend on it). */
  translations?: () => TemplateTranslation[];
  assets?: TemplateAsset[];
  /** In order: a parent before its children. */
  contents?: TemplateContent[];
}
