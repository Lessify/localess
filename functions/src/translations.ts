import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {BATCH_MAX, bucket, firestoreService, ROLE_ADMIN, ROLE_WRITE} from './config';
import {Space} from './models/space.model';
import {
  Translation,
  TranslationExportImport,
  TranslationLocale,
  TranslationsExportData,
  TranslationsImportData,
  TranslationType
} from './models/translation.model';
import {FieldValue, QuerySnapshot, Timestamp, WriteBatch} from 'firebase-admin/firestore';
import axios from 'axios';

// Publish
interface PublishTranslationsData {
  spaceId: string
}

export const translationsPublish = https.onCall(async (data: PublishTranslationsData, context) => {
  logger.info('[publishTranslations] data: ' + JSON.stringify(data));
  logger.info('[publishTranslations] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const translationsSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/translations`).get();
  if (spaceSnapshot.exists && !translationsSnapshot.empty) {
    const space: Space = spaceSnapshot.data() as Space;
    const translations = translationsSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Translation);

    for (const locale of space.locales) {
      const localeJson: { [key: string]: string } = {};
      for (const tr of translations) {
        let value = tr.locales[locale.id];
        if (!value) {
          value = tr.locales[space.localeFallback.id];
        }
        localeJson[tr.name] = value;
      }
      // Save generated JSON
      logger.info(`[publishTranslations] Save file to spaces/${data.spaceId}/translations/${locale.id}.json`);
      bucket.file(`spaces/${data.spaceId}/translations/${locale.id}.json`)
        .save(
          JSON.stringify(localeJson),
          (err?: Error | null) => {
            if (err) {
              logger.error(`[publishTranslations] Can not save file for Space(${data.spaceId}) and Locale(${locale})`);
              logger.error(err);
            }
          }
        );
      const origin = context.rawRequest.header('origin');
      if (origin && !origin.includes('//localhost:')) {
        const url = `/api/v1/spaces/${data.spaceId}/translations/${locale.id}.json`;
        await axios.request({
          baseURL: origin,
          url: url,
          method: 'PURGE',
        });
        logger.info(`[publishTranslations] purge url ${origin}${url}`);
      }
    }
    return;
  } else {
    logger.info(`[publishTranslations] Space ${data.spaceId} does not exist or no translations.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});

// Export
export const translationsExport = https.onCall(async (data: TranslationsExportData, context) => {
  logger.info('[translationsExport] data: ' + JSON.stringify(data));
  logger.info('[translationsExport] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const translationsRef = firestoreService.collection(`spaces/${data.spaceId}/translations`);

  let translationsSnapshot: QuerySnapshot;
  if (data.fromDate) {
    translationsSnapshot = await translationsRef.where('updatedOn', '>=', Timestamp.fromMillis(data.fromDate)).get()
  } else {
    translationsSnapshot = await translationsRef.get();
  }

  if (spaceSnapshot.exists) {
    // const space: Space = spaceSnapshot.data() as Space
    // FLAT
    if (data.kind === 'FLAT') {
      const exportedTr: TranslationLocale = {};
      translationsSnapshot.docs.filter((it) => it.exists)
        .forEach((it) => {
          const tr = it.data() as Translation;
          const value = tr.locales[data.locale];
          if (value) {
            exportedTr[tr.name] = tr.locales[data.locale]
          }
        });
      return exportedTr;
    } else if (data.kind === 'FULL') {
      const exportedTrs: TranslationExportImport[] = [];
      translationsSnapshot.docs.filter((it) => it.exists)
        .forEach((it) => {
          const tr = it.data() as Translation;
          const exportedTr: TranslationExportImport = {
            name: tr.name,
            locales: tr.locales
          }
          if (tr.labels && tr.labels.length > 0) {
            exportedTr.labels = tr.labels
          }
          if (tr.description && tr.description.length > 0) {
            exportedTr.description = tr.description
          }
          exportedTrs.push(exportedTr)
        });
      return exportedTrs;
    } else {
      logger.warn(`[translationsExport] Kind is invalid.`);
      throw new https.HttpsError('invalid-argument', 'Invalid kind argument');
    }
  } else {
    logger.warn(`[translationsExport] Space ${data.spaceId} does not exist.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
})

// Import
export const translationsImport = https.onCall(async (data: TranslationsImportData, context) => {
  // logger.info('[translationsImport] data: ' + JSON.stringify(data));
  logger.info('[translationsImport] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const spaceSnapshot = await firestoreService.doc(`spaces/${data.spaceId}`).get();
  const translationsSnapshot = await firestoreService.collection(`spaces/${data.spaceId}/translations`).get();

  let totalChanges = 0;
  const origTransMap = new Map<string, Translation>();
  const origTransIdMap = new Map<string, string>();
  const batches: WriteBatch[] = [];

  if (spaceSnapshot.exists) {
    // FLAT
    if (data.kind === 'FLAT') {
      const importT: { [key: string]: string } = data.translations;
      translationsSnapshot.docs.filter((it) => it.exists)
        .forEach((it) => {
          const tr = it.data() as Translation;
          origTransMap.set(tr.name, tr);
          origTransIdMap.set(tr.name, it.id);
        });

      Object.getOwnPropertyNames(importT).forEach((name, idx) => {
        const batchIdx = Math.round(idx / BATCH_MAX);
        if (batches.length < batchIdx + 1) {
          batches.push(firestoreService.batch());
        }
        const ot = origTransMap.get(name);
        const oid = origTransIdMap.get(name);
        if (ot && oid) {
          // update
          if (ot.locales[data.locale] !== importT[name]) {
            // update if locale values are different
            const update: any = {
              updatedOn: FieldValue.serverTimestamp(),
            };
            update[`locales.${data.locale}`] = importT[name];
            batches[batchIdx].update(firestoreService.doc(`spaces/${data.spaceId}/translations/${oid}`), update);
            totalChanges++;
          }
        } else {
          // add
          const addEntity: any = {
            name: name,
            type: TranslationType.STRING,
            locales: {},
            createdOn: FieldValue.serverTimestamp(),
            updatedOn: FieldValue.serverTimestamp(),
          };
          addEntity.locales[data.locale] = importT[name];
          batches[batchIdx].set(firestoreService.collection(`spaces/${data.spaceId}/translations`).doc(), addEntity);
          totalChanges++;
        }
      });
      logger.info('[translationsImport] Batch size : ' + batches.length);
      logger.info('[translationsImport] Batch total changes : ' + totalChanges);
      return await Promise.all(batches.map((it) => it.commit()));

    } else if (data.kind === 'FULL') {

      const importT: TranslationExportImport[] = data.translations;
      translationsSnapshot.docs.filter((it) => it.exists)
        .forEach((it) => {
          const tr = it.data() as Translation;
          origTransMap.set(tr.name, tr);
          origTransIdMap.set(tr.name, it.id);
        });

      importT.forEach((value, idx) => {
        const batchIdx = Math.round(idx / BATCH_MAX);
        if (batches.length < batchIdx + 1) {
          batches.push(firestoreService.batch());
        }
        const ot = origTransMap.get(value.name);
        const oid = origTransIdMap.get(value.name);
        if (ot && oid) {
          const space: Space = spaceSnapshot.data() as Space
          // update
          const update: any = {
            updatedOn: FieldValue.serverTimestamp(),
          };
          // update locales
          space.locales.forEach(locale => {
            if (ot.locales[locale.id] !== value.locales[locale.id]) {
              update[`locales.${locale.id}`] = value.locales[locale.id];
            }
          })
          // update description
          if (value.description && value.description.length > 0 && ot.description !== value.description) {
            update.description = value.description;
          }
          // edit labels
          if (ot.labels && value.labels && value.labels.length > 0) {
            update.labels = [...new Set([...ot.labels, ...value.labels])];
          } else if (value.labels && value.labels.length > 0) {
            // add label
            update.labels = value.locales
          }
          logger.info('sdgsdg')
          if (Object.getOwnPropertyNames(update).length > 1) {
            batches[batchIdx].update(firestoreService.doc(`spaces/${data.spaceId}/translations/${oid}`), update);
            totalChanges++;
          }
        } else {
          // add
          const addEntity: any = {
            name: value.name,
            type: TranslationType.STRING,
            locales: value.locales,
            createdOn: FieldValue.serverTimestamp(),
            updatedOn: FieldValue.serverTimestamp(),
          };
          // add description
          if (value.description && value.description.length > 0) {
            addEntity.description = value.description;
          }
          // add labels
          if (value.labels && value.labels.length > 0) {
            addEntity.labels = value.labels;
          }
          batches[batchIdx].set(firestoreService.collection(`spaces/${data.spaceId}/translations`).doc(), addEntity);
          totalChanges++;
        }

      })
      logger.info('[translationsImport] Batch size : ' + batches.length);
      logger.info('[translationsImport] Batch total changes : ' + totalChanges);
      if (totalChanges > 0) {
        return await Promise.all(batches.map((it) => it.commit()));
      }
      return "no-changes"
    } else {
      logger.warn(`[translationsImport] Kind is invalid.`);
      throw new https.HttpsError('invalid-argument', 'Invalid kind argument');
    }
  } else {
    logger.warn(`[translationsImport] Space ${data.spaceId} does not exist.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});
