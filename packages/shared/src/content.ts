import type { ContentData } from './models/content.model.js';
import { isFieldTranslatable, type Schema, SchemaFieldKind, SchemaType } from './models/schema.model.js';

/*
 * Locale extraction of a content block, used by the server to build the documents the public API serves and
 * by the editor for the Visual Editor preview. Ported from functions/src/services/content.service.ts.
 */

/**
 * Schema id of a stored block. Blocks saved before `_schema` existed carry it only under the
 * legacy `schema` key, which is read as a fallback and never served.
 */
export function contentSchemaId(content: ContentData): string {
  return content._schema || content['schema'];
}

/** The block as served for `locale`: translatable fields read `{field}_i18n_{locale}`, falling back to `{field}`. */
export function extractContent(content: ContentData, schemas: Map<string, Schema>, locale: string): ContentData {
  const schemaId = contentSchemaId(content);
  const extractedContentData: ContentData = {
    _id: content._id,
    _schema: schemaId,
  };
  const schema = schemas.get(schemaId);
  if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
    for (const field of schema?.fields || []) {
      if (field.kind === SchemaFieldKind.SCHEMA) {
        const fieldContent: ContentData | undefined = content[field.name];
        if (fieldContent) {
          extractedContentData[field.name] = extractContent(fieldContent, schemas, locale);
        }
      } else if (field.kind === SchemaFieldKind.SCHEMAS) {
        const fieldContent: ContentData[] | undefined = content[field.name];
        if (fieldContent && Array.isArray(fieldContent)) {
          extractedContentData[field.name] = fieldContent.map(it => extractContent(it, schemas, locale));
        }
      } else {
        if (isFieldTranslatable(field)) {
          let value = content[`${field.name}_i18n_${locale}`];
          if (value === undefined) {
            value = content[field.name];
          }
          extractedContentData[field.name] = value;
        } else {
          extractedContentData[field.name] = content[field.name];
        }
      }
    }
  }
  return extractedContentData;
}
