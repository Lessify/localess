import { SchemaFieldKind } from '../models';

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
