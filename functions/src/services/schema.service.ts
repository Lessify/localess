import { firestoreService } from '../config';
import { DocumentReference, Query, Timestamp } from 'firebase-admin/firestore';
import { Schema, SchemaComponent, SchemaComponentExport, SchemaEnum, SchemaEnumExport, SchemaExport, SchemaType } from '../models';
import { isLabelsEqual } from '../utils/import-utils';

/**
 * find Schema by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findSchemaById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/schemas/${id}`);
}

/**
 * find Schemas
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findSchemas(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/schemas`);
  if (fromDate) {
    assetsRef = assetsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  return assetsRef;
}

/**
 * Returns true if any imported field differs from the existing Firestore schema document.
 * Compares type, displayName, description, and labels for all schema types.
 * For ROOT/NODE schemas, also compares previewField and fields array (deep via JSON.stringify).
 * For ENUM schemas, also compares the values array (deep via JSON.stringify).
 * @param {Schema} existing - the current Firestore schema document
 * @param {SchemaExport} imported - the schema data parsed from the import file
 * @return {boolean} true if at least one field has changed
 */
export function isSchemaChanged(existing: Schema, imported: SchemaExport): boolean {
  if (existing.type !== imported.type) return true;
  if ((existing.displayName ?? undefined) !== (imported.displayName ?? undefined)) return true;
  if ((existing.description ?? undefined) !== (imported.description ?? undefined)) return true;
  if (!isLabelsEqual(existing.labels, imported.labels)) return true;
  if (
    (existing.type === SchemaType.ROOT || existing.type === SchemaType.NODE) &&
    (imported.type === SchemaType.ROOT || imported.type === SchemaType.NODE)
  ) {
    const e = existing as SchemaComponent;
    const i = imported as SchemaComponentExport;
    if ((e.previewField ?? undefined) !== (i.previewField ?? undefined)) return true;
    if (JSON.stringify(e.fields ?? []) !== JSON.stringify(i.fields ?? [])) return true;
  }
  if (existing.type === SchemaType.ENUM && imported.type === SchemaType.ENUM) {
    const e = existing as SchemaEnum;
    const i = imported as SchemaEnumExport;
    if (JSON.stringify(e.values ?? []) !== JSON.stringify(i.values ?? [])) return true;
  }
  return false;
}
