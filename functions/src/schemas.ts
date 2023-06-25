import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {UserPermission} from './models/user.model';
import {Schema, SchemaExportImport, SchemasExportData, SchemasImportData} from './models/schema.model';
import {BATCH_MAX, firestoreService} from './config';
import {QuerySnapshot, Timestamp, FieldValue, WriteBatch} from 'firebase-admin/firestore';

// Export
export const schemasExport = https.onCall(async (data: SchemasExportData, context) => {
  logger.info('[schemasExport] data: ' + JSON.stringify(data));
  logger.info('[schemasExport] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.SCHEMA_EXPORT, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const schemasRef = firestoreService.collection(`spaces/${data.spaceId}/schemas`);

  let schemasSnapshot: QuerySnapshot;
  if (data.fromDate) {
    schemasSnapshot = await schemasRef.where('updatedAt', '>=', Timestamp.fromMillis(data.fromDate)).get();
  } else {
    schemasSnapshot = await schemasRef.get();
  }

  if (spaceSnapshot.exists) {
    const exportSchemas: SchemaExportImport[] = [];
    schemasSnapshot.docs.filter((it) => it.exists)
      .forEach((it) => {
        const schema = it.data() as Schema;
        const exportedSchema: SchemaExportImport = {
          id: it.id,
          name: schema.name,
          type: schema.type,
          displayName: schema.displayName,
          fields: schema.fields,
        };
        exportSchemas.push(exportedSchema);
      });
    return exportSchemas;
  } else {
    logger.warn(`[schemasExport] Space ${data.spaceId} does not exist.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});

// Import
export const schemasImport = https.onCall(async (data: SchemasImportData, context) => {
  logger.info(`[schemasImport] data: ${JSON.stringify(data)}`);
  logger.info('[schemasImport] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.SCHEMA_IMPORT, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const schemasSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/schemas`).get();

  let totalChanges = 0;
  const origSchemasMap = new Map<string, Schema>();
  const batches: WriteBatch[] = [];
  if (spaceSnapshot.exists) {
    schemasSnapshot.docs.filter((it) => it.exists)
      .forEach((it) => {
        const schema = it.data() as Schema;
        origSchemasMap.set(it.id, schema);
      });
    data.schemas.forEach((schema, idx) => {
      const batchIdx = Math.round(idx / BATCH_MAX);
      if (batches.length < batchIdx + 1) {
        batches.push(firestoreService.batch());
      }
      const originalSchema = origSchemasMap.get(schema.id);
      if (originalSchema) {
        // Exists - update
        const update: any = {
          name: schema.name,
          type: schema.type,
          displayName: schema.displayName || FieldValue.delete(),
          fields: schema.fields || FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batches[batchIdx].update(firestoreService.doc(`spaces/${data.spaceId}/schemas/${schema.id}`), update);
        totalChanges++;
      } else {
        // Doesn't exist - add
        const addEntity: any = {
          name: schema.name,
          type: schema.type,
          displayName: schema.displayName || FieldValue.delete(),
          fields: schema.fields || FieldValue.delete(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batches[batchIdx].set(firestoreService.collection(`spaces/${data.spaceId}/schemas`).doc(), addEntity);
        totalChanges++;
      }
    });
    logger.info('[schemasImport] Batch size : ' + batches.length);
    logger.info('[schemasImport] Batch total changes : ' + totalChanges);
    return await Promise.all(batches.map((it) => it.commit()));
  } else {
    logger.warn(`[schemasImport] Space ${data.spaceId} does not exist.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});
