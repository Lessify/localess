import { CONTENT_DEFAULT_LOCALE, ContentAsset, ContentData, ContentReference, isContentAsset, isContentLink, isContentReference, isFieldTranslatable, isSchemaArray, Schema, SchemaComponent, SchemaFieldKind, SchemaType } from '@localess/shared';
import { TranslatableField } from '@shared/models/translate.model';
import { generateHTML, generateJSON, JSONContent } from '@tiptap/core';
import { v4 } from 'uuid';

import { createRichTextExtensions } from '../../features/spaces/contents/shared/rich-text-editor/rich-text-extensions';

// Pure functions over document content. Code that builds forms stays in ContentHelperService.

/** Whether a TipTap document carries any text worth translating. */
function hasTranslatableText(node: JSONContent): boolean {
  if (typeof node.text === 'string' && node.text.trim() !== '') return true;
  return (node.content ?? []).some(hasTranslatableText);
}

/**
 * Whether a stored field value has nothing to translate.
 *
 * Covers the three shapes a value arrives in: absent, a string, or a TipTap document. Whitespace
 * counts as nothing - sending `"   "` to a provider costs a request and returns whitespace - and
 * so does a document whose only content is empty paragraphs or an image.
 */
function isBlankValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return !hasTranslatableText(value as JSONContent);
  return false;
}

/** Field kinds whose value is text a translation provider can handle. */
const TRANSLATABLE_KINDS = new Set<SchemaFieldKind>([
  SchemaFieldKind.TEXT,
  SchemaFieldKind.TEXTAREA,
  SchemaFieldKind.MARKDOWN,
  SchemaFieldKind.RICH_TEXT,
]);

/**
 * Extract Schema Content based on locale
 * @param data
 * @param schema
 * @param locale
 * @param full
 */
export function extractSchemaContent(data: ContentData, schema: SchemaComponent, locale: string, full: boolean): Record<string, any> {
  //console.group('extractSchemaContent')
  //console.log('data',data)
  const isDefaultLocale = locale === CONTENT_DEFAULT_LOCALE.id;
  const result: Record<string, any> = {};
  schema.fields
    ?.filter(it => full || ![SchemaFieldKind.SCHEMA, SchemaFieldKind.SCHEMAS].includes(it.kind))
    ?.forEach(field => {
      //console.log('field', field)
      let value;
      if (isFieldTranslatable(field) && !isDefaultLocale) {
        // Extract Locale specific values
        value = data[`${field.name}_i18n_${locale}`];
      } else {
        // Extract not translatable values or Default Locale
        value = data[field.name];
      }
      if (value !== undefined) {
        if (isSchemaArray(field)) {
          if (Array.isArray(value)) {
            result[field.name] = value;
          }
        } else {
          if (!Array.isArray(value)) {
            result[field.name] = value;
          }
        }
      }
    });
  //console.log('result',result)
  //console.groupEnd()
  return result;
}

/**
 * Extract References to other Content or Asset
 * @param {ContentData} data - document
 * @param {Schema[]} schemas
 * @param {string} locale
 * @return {[Set<string>, Set<string>, Set<string>]} [inUseAssets, inUseLinks, inUseReferences]
 */
export function extractReferences(
  data: ContentData | undefined,
  schemas: Schema[],
  locale: string,
): [Set<string>, Set<string>, Set<string>] {
  //console.group('extractReferences', locale);
  const inUseAssets = new Set<string>();
  const inUseLinks = new Set<string>();
  const inUseReferences = new Set<string>();
  const schemasById = new Map<string, Schema>(schemas.map(it => [it.id, it]));
  if (data === undefined) return [inUseAssets, inUseLinks, inUseReferences];
  const contentIteration = [data];
  // Iterative traversing content and extracting references.
  let selectedContent = contentIteration.pop();
  while (selectedContent) {
    const schema = schemasById.get(selectedContent._schema);
    if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
      const schemaContent = extractSchemaContent(selectedContent, schema, locale, true);
      // handle array like Asset/Reference Array
      Object.getOwnPropertyNames(schemaContent).forEach(fieldName => {
        const content = schemaContent[fieldName];
        //console.log(fieldName, content);
        if (content instanceof Array) {
          if (content.some(it => it.kind === SchemaFieldKind.ASSET)) {
            // Assets
            const assets: ContentAsset[] = content;
            assets.forEach(it => inUseAssets.add(it.uri));
          } else if (content.some(it => it.kind === SchemaFieldKind.REFERENCE)) {
            // References
            const references: ContentReference[] = content;
            references.forEach(it => inUseReferences.add(it.uri));
          }
        } else {
          if (isContentAsset(content)) {
            inUseAssets.add(content.uri);
          } else if (isContentReference(content)) {
            inUseReferences.add(content.uri);
          } else if (isContentLink(content) && content.type === 'content') {
            inUseLinks.add(content.uri);
          }
        }
      });

      //console.log(schemaContent);
      schema.fields
        ?.filter(it => it.kind === SchemaFieldKind.SCHEMA)
        .forEach(field => {
          const sch: ContentData | undefined = selectedContent && selectedContent[field.name];
          if (sch) {
            contentIteration.push(sch);
          }
        });
      schema.fields
        ?.filter(it => it.kind === SchemaFieldKind.SCHEMAS)
        .forEach(field => {
          const sch: ContentData[] | undefined = selectedContent![field.name];
          sch?.forEach(it => contentIteration.push(it));
        });
    }
    selectedContent = contentIteration.pop();
  }
  //console.log(inUseAssets, inUseReferences);
  //console.groupEnd();
  return [inUseAssets, inUseLinks, inUseReferences];
}

/**
 * Collect every field a whole-document translation should fill.
 *
 * Traverses the document the way {@link extractReferences} does, but reads the raw
 * locale-suffixed keys off each node rather than going through `extractSchemaContent`, because
 * it needs both the source value and whether the target is still empty.
 *
 * RICH_TEXT is serialized to HTML - the only shape a provider can translate without flattening
 * the document - and parsed back on apply. Everything else travels as plain text.
 *
 * Each entry carries its own `apply` closure, so the caller writes results back without parsing
 * ids or walking the tree a second time.
 * @param data root content node; the returned closures mutate it in place
 * @param schemas every schema in the space
 * @param sourceLocaleId locale to translate from
 * @param targetLocaleId locale to translate into
 * @param options `overwrite` includes targets that already have a value
 */
export function collectTranslatableFields(
  data: ContentData,
  schemas: Schema[],
  sourceLocaleId: string,
  targetLocaleId: string,
  options: { overwrite?: boolean } = {},
): TranslatableField[] {
  const fields: TranslatableField[] = [];
  const schemasById = new Map<string, Schema>(schemas.map(it => [it.id, it]));
  const richTextExtensions = createRichTextExtensions();
  const contentIteration = [data];
  let selectedContent = contentIteration.pop();

  while (selectedContent) {
    const node = selectedContent;
    const schema = schemasById.get(node._schema);
    if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
      for (const field of (schema as SchemaComponent).fields || []) {
        if (field.kind === SchemaFieldKind.SCHEMA) {
          const child: ContentData | undefined = node[field.name];
          if (child) contentIteration.push(child);
          continue;
        }
        if (field.kind === SchemaFieldKind.SCHEMAS) {
          const children: ContentData[] | undefined = node[field.name];
          children?.forEach(it => contentIteration.push(it));
          continue;
        }
        if (!isFieldTranslatable(field)) continue;
        if (!TRANSLATABLE_KINDS.has(field.kind)) continue;

        // The default locale's value lives under the bare field name; every other locale is
        // suffixed. That holds for whichever end of the translation it is on.
        const sourceKey = sourceLocaleId === CONTENT_DEFAULT_LOCALE.id ? field.name : `${field.name}_i18n_${sourceLocaleId}`;
        const targetKey = targetLocaleId === CONTENT_DEFAULT_LOCALE.id ? field.name : `${field.name}_i18n_${targetLocaleId}`;
        const sourceValue = node[sourceKey];
        if (isBlankValue(sourceValue)) continue;
        if (!options.overwrite && !isBlankValue(node[targetKey])) continue;

        if (field.kind === SchemaFieldKind.RICH_TEXT) {
          // A field written through the API can hold a plain string rather than a document.
          const html = typeof sourceValue === 'string' ? sourceValue : generateHTML(sourceValue, richTextExtensions);
          fields.push({
            id: `${node._id}.${field.name}`,
            content: html,
            format: 'html',
            apply: translated => (node[targetKey] = generateJSON(translated, richTextExtensions)),
          });
        } else {
          fields.push({
            id: `${node._id}.${field.name}`,
            content: String(sourceValue),
            format: 'text',
            apply: translated => (node[targetKey] = translated),
          });
        }
      }
    }
    selectedContent = contentIteration.pop();
  }

  return fields;
}

/**
 * A deep copy of `data` in the shape it is stored in: links, references and assets without a `uri`,
 * `null`/`undefined` values and empty arrays are dropped, and a block stored before `_schema` existed
 * has its legacy `schema` key moved to `_schema`. Documents are loaded, compared and saved in this shape.
 */
export function normalizeContent<T>(data: T): T {
  return copyContent(data, false);
}

/** A normalized copy of a block with new ids, for it and every block inside it. */
export function copyBlock(block: ContentData): ContentData {
  return copyContent(block, true);
}

function copyContent<T>(source: T, generateNewID: boolean): T {
  if (Array.isArray(source)) {
    const target: any = Object.assign([], source);
    Object.getOwnPropertyNames(target).forEach(value => {
      if (target[value] instanceof Object) {
        target[value] = copyContent(target[value], generateNewID);
      }
    });
    return target;
  } else if (source instanceof Object || typeof source === 'object') {
    const target: any = Object.assign({}, source);
    Object.getOwnPropertyNames(target).forEach(fieldName => {
      const value = target[fieldName];
      if (target[fieldName] instanceof Object || typeof target[fieldName] === 'object') {
        target[fieldName] = copyContent(target[fieldName], generateNewID);
        if (Object.getOwnPropertyNames(target[fieldName]).some(it => it === 'kind')) {
          if (isContentLink(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
            delete target[fieldName];
          } else if (isContentReference(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
            delete target[fieldName];
          } else if (isContentAsset(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
            delete target[fieldName];
          }
        }
      }
      if (generateNewID && fieldName === '_id') {
        target[fieldName] = v4();
      }
      // Only a block without `_schema` predates it, so only there is `schema` the legacy key rather than a field.
      if (fieldName === 'schema' && '_id' in target && target['_schema'] === undefined) {
        target['_schema'] = value;
        delete target[fieldName];
        return;
      }
      if (value == null) {
        delete target[fieldName];
      } else if (Array.isArray(value) && value.length === 0) {
        delete target[fieldName];
      }
    });
    return target;
  }
  return null as unknown as T;
}
