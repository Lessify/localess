import {firestore, https, logger} from 'firebase-functions';
import {App, initializeApp} from 'firebase-admin/app';
import {FieldValue, Firestore, getFirestore, WriteBatch} from 'firebase-admin/firestore';
import {getStorage, Storage} from 'firebase-admin/storage';
import {Space} from './models/space.model';
import {Translation, TranslationType} from './models/translation.model';
import * as express from 'express';
import * as cors from 'cors';
import {SecurityUtils} from './utils/security-utils';
import {EventContext} from 'firebase-functions/lib/cloud-functions';
import {QueryDocumentSnapshot} from 'firebase-functions/lib/providers/firestore';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

// Const
const BATCH_MAX = 500;
// HTTP
const CACHE_MAX_AGE = 60 * 60;// sec * min
const CACHE_SHARE_MAX_AGE = 60 * 60;// sec * min
// AUTH ROLE
// const ROLE_READ = 'read';
const ROLE_WRITE = 'write';
const ROLE_ADMIN = 'admin';

// Init
const app: App = initializeApp();
const firestoreService: Firestore = getFirestore(app);
const storage: Storage = getStorage(app);
const bucket = storage.bucket();

// API V1
const expressV1 = express();
expressV1.use(cors({origin: true}));
expressV1.get('/api/v1/spaces/:spaceId/translations/:locale.json', async (req, res) => {
  logger.info('v1 spaces : ' + JSON.stringify(req.params));
  const spaceId = req.params.spaceId;
  let locale = req.params.locale;
  const spaceRef = await firestoreService.doc(`spaces/${spaceId}`).get();
  if (!spaceRef.exists) {
    res
    .status(404)
    .send(new https.HttpsError('not-found', 'Space not found'));
  }
  const space = spaceRef.data() as Space;
  if (!space.locales.some((it) => it.id === locale)) {
    locale = space.localeFallback.id;
  }
  bucket.file(`spaces/${spaceId}/translations/${locale}.json`).download()
  .then((content) => {
    res
    .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
    .contentType('application/json')
    .send(content.toString());
  })
  .catch(() => {
    res
    .status(404)
    .send(new https.HttpsError('not-found', 'File not found, Publish first.'));
  });
});
export const v1 = https.onRequest(expressV1);

// Publish
export const publishTranslations = https.onCall((data, context) => {
  //logger.info('[publishTranslations] data: ' + JSON.stringify(data));
  logger.info('[publishTranslations] context.auth: ' + JSON.stringify(context.auth));
  if (SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN])) return new https.HttpsError('permission-denied', 'permission-denied');
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
      return new https.HttpsError('not-found', 'Space not found');
    }
  });
});

// Import JSON
export const importLocaleJson = https.onCall(async (data, context) => {
  //logger.info('[importLocaleJson] data: ' + JSON.stringify(data));
  logger.info('[importLocaleJson] context.auth: ' + JSON.stringify(context.auth));
  if (SecurityUtils.hasAnyRole([ROLE_WRITE, ROLE_ADMIN])) return new https.HttpsError('permission-denied', 'permission-denied');
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
    return new https.HttpsError('not-found', 'Space not found');
  }
});

// Firestore events
export const onDeleteSpace = firestore.document('spaces/{spaceId}')
.onDelete((snapshot: QueryDocumentSnapshot, context: EventContext) => {
  logger.info(`[Space::onDelete] id='${snapshot.id}' exists=${snapshot.exists} eventId='${context.eventId}'`);
  return bucket.deleteFiles({
    prefix: `spaces/${snapshot.id}/`
  })
});
