import { SchemaFieldKind } from '../models';

/**
 * Check if a schema field kind supports AI translation.
 * @param {SchemaFieldKind} kind Schema field kind
 * @return {boolean} true if fields of this kind can be translated by AI
 */
export function isSchemaFieldKindAITranslatable(kind: SchemaFieldKind): boolean {
  switch (kind) {
    case SchemaFieldKind.TEXT:
    case SchemaFieldKind.TEXTAREA:
    case SchemaFieldKind.MARKDOWN:
    case SchemaFieldKind.SCHEMA:
    case SchemaFieldKind.SCHEMAS:
      return true;
    case SchemaFieldKind.RICH_TEXT:
      return false; // nested JSON not supported at the moment
    default:
      return false;
  }
}
