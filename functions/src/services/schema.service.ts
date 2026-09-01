import { BATCH_MAX, firestoreService } from '../config';
import { DocumentReference, FieldValue, Query, Timestamp, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import { SchemaComponent, SchemaEnum, SchemaType } from '../models';
import { SchemaPushPlan } from '../utils/schema.utils';

export { docSchemaToExport, isSchemaChanged, planSchemaPush } from '../utils/schema.utils';
export type { SchemaPushPlan } from '../utils/schema.utils';

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
 * Apply a schema push plan to Firestore in batches of BATCH_MAX.
 * Creates set fresh timestamps; updates preserve createdAt and clear absent optionals.
 * @param {string} spaceId space identifier
 * @param {SchemaPushPlan} plan plan produced by planSchemaPush
 * @return {Promise<void>} resolves when all batches are committed
 */
export async function applySchemaPushPlan(spaceId: string, plan: SchemaPushPlan): Promise<void> {
  let batch = firestoreService.batch();
  let count = 0;
  const commitIfFull = async () => {
    count++;
    if (count === BATCH_MAX) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  };
  for (const schema of plan.creates) {
    const ref = findSchemaById(spaceId, schema.id);
    if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
      const add: WithFieldValue<SchemaComponent> = {
        type: schema.type,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (schema.displayName) add.displayName = schema.displayName;
      if (schema.description) add.description = schema.description;
      if (schema.previewField) add.previewField = schema.previewField;
      if (schema.labels) add.labels = schema.labels;
      if (schema.fields) add.fields = schema.fields;
      batch.set(ref, add);
    } else if (schema.type === SchemaType.ENUM) {
      const add: WithFieldValue<SchemaEnum> = {
        type: schema.type,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (schema.displayName) add.displayName = schema.displayName;
      if (schema.description) add.description = schema.description;
      if (schema.labels) add.labels = schema.labels;
      if (schema.values) add.values = schema.values;
      batch.set(ref, add);
    }
    await commitIfFull();
  }
  for (const schema of plan.updates) {
    const ref = findSchemaById(spaceId, schema.id);
    if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
      const update: UpdateData<SchemaComponent> = {
        type: schema.type,
        displayName: schema.displayName || FieldValue.delete(),
        description: schema.description || FieldValue.delete(),
        previewField: schema.previewField || FieldValue.delete(),
        labels: schema.labels || FieldValue.delete(),
        fields: schema.fields || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.update(ref, update);
    } else if (schema.type === SchemaType.ENUM) {
      const update: UpdateData<SchemaEnum> = {
        type: schema.type,
        displayName: schema.displayName || FieldValue.delete(),
        description: schema.description || FieldValue.delete(),
        labels: schema.labels || FieldValue.delete(),
        values: schema.values || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.update(ref, update);
    }
    await commitIfFull();
  }
  for (const id of plan.deletes) {
    batch.delete(findSchemaById(spaceId, id));
    await commitIfFull();
  }
  if (count > 0) {
    await batch.commit();
  }
}
