import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {BATCH_MAX, bucket, firestoreService, ROLE_ADMIN, ROLE_WRITE} from './config';
import {Space} from './models/space.model';
import {Translation, TranslationType} from './models/translation.model';
import {FieldValue, WriteBatch} from 'firebase-admin/firestore';

// Publish
interface PublishTranslationsData {
  spaceId: string
}

export const publishTranslations = https.onCall((data: PublishTranslationsData, context) => {
  // logger.info('[publishTranslations] data: ' + JSON.stringify(data));
  logger.info('[publishTranslations] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceId: string = data.spaceId;
  return Promise.all([
    firestoreService.doc(`spaces/${spaceId}`).get(),
    firestoreService.collection(`spaces/${spaceId}/translations`).get(),
  ])
    .then(([spaceRef, translationsRef]) => {
      if (spaceRef.exists && !translationsRef.empty) {
        const space: Space = spaceRef.data() as Space;
        const translations = translationsRef.docs.filter((it) => it.exists).map((it) => it.data() as Translation);

        space.locales.forEach((locale) => {
          const localeJson: { [key: string]: string } = {};
          translations.forEach((tr) => {
            let value = tr.locales[locale.id];
            if (!value) {
              value = tr.locales[space.localeFallback.id];
            }
            localeJson[tr.name] = value;
          });
          // Save generated JSON
          logger.info(`[publishTranslations] Save file to spaces/${spaceId}/translations/${locale.id}.json`);
          bucket.file(`spaces/${spaceId}/translations/${locale.id}.json`)
            .save(
              JSON.stringify(localeJson),
              (err?: Error | null) => {
                if (err) {
                  logger.error(`[publishTranslations] Can not save file for Space(${spaceId}) and Locale(${locale})`);
                  logger.error(err);
                }
              }
            );
        });
        return;
      } else {
        logger.info(`[publishTranslations] Space ${spaceId} does not exist or no translations.`);
        throw new https.HttpsError('not-found', 'Space not found');
      }
    });
});

// Import JSON
interface ImportLocaleJsonData {
  spaceId: string
  locale: string
  translations: { [key: string]: string }
}

export const importLocaleJson = https.onCall(async (data: ImportLocaleJsonData, context) => {
  // logger.info('[importLocaleJson] data: ' + JSON.stringify(data));
  logger.info('[importLocaleJson] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceId: string = data.spaceId;
  const locale: string = data.locale;
  const importT: { [key: string]: string } = data.translations;
  let totalChanges = 0;

  const spaceRef = await firestoreService.doc(`spaces/${spaceId}`).get();
  const translationsRef = await firestoreService.collection(`spaces/${spaceId}/translations`).get();

  if (spaceRef.exists) {
    // const space: Space = spaceRef.data() as Space
    const origTransMap = new Map<string, Translation>();
    const origTransIdMap = new Map<string, string>();
    translationsRef.docs.filter((it) => it.exists)
      .forEach((it) => {
        const tr = it.data() as Translation;
        origTransMap.set(tr.name, tr);
        origTransIdMap.set(tr.name, it.id);
      });

    const batches: WriteBatch[] = [];

    Object.getOwnPropertyNames(importT).forEach((name, idx) => {
      const batchIdx = Math.round(idx / BATCH_MAX);
      if (batches.length < batchIdx + 1) {
        batches.push(firestoreService.batch());
      }
      const ot = origTransMap.get(name);
      const oid = origTransIdMap.get(name);
      if (ot && oid) {
        // update
        if (ot.locales[locale] !== importT[name]) {
          // update if locale values are different
          const update: any = {
            updatedOn: FieldValue.serverTimestamp(),
          };
          update[`locales.${locale}`] = importT[name];
          batches[batchIdx].update(firestoreService.doc(`spaces/${spaceId}/translations/${oid}`), update);
          totalChanges++;
        }
      } else {
        // add
        const addEntity: any = {
          name: name,
          type: TranslationType.STRING,
          locales: {},
          labels: [],
          description: '',
          createdOn: FieldValue.serverTimestamp(),
          updatedOn: FieldValue.serverTimestamp(),
        };
        addEntity.locales[locale] = importT[name];
        batches[batchIdx].set(firestoreService.collection(`spaces/${spaceId}/translations`).doc(), addEntity);
        totalChanges++;
      }
    });
    logger.info('[importLocaleJson] Batch size : ' + batches.length);
    logger.info('[importLocaleJson] Batch total changes : ' + totalChanges);
    return await Promise.all(batches.map((it) => it.commit()));
  } else {
    logger.warn(`[importLocaleJson] Space ${spaceId} does not exist.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});
