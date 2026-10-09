import { ContentData, isContentAsset, isContentLink, isContentReference } from '@localess/shared';
import { v4 } from 'uuid';

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
