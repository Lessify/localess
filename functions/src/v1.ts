import * as express from 'express';
import * as cors from 'cors';
import {https, logger} from 'firebase-functions';
import {bucket, CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, firestoreService} from './config';
import {Space} from './models/space.model';

// API V1
const expressV1 = express();
expressV1.use(cors({origin: true}));
expressV1.get('/api/v1/spaces/:spaceId/translations/:locale.json', async (req, res) => {
  logger.info('v1 spaces translations : ' + JSON.stringify(req.params));
  const spaceId = req.params.spaceId;
  let locale = req.params.locale;
  const spaceRef = await firestoreService.doc(`spaces/${spaceId}`).get();
  if (!spaceRef.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new https.HttpsError('not-found', 'Space not found'));
    return;
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

expressV1.get('/api/v1/spaces/:spaceId/pages/:pageId/:locale.json', async (req, res) => {
  logger.info('v1 spaces pages: ' + JSON.stringify(req.params));
  const spaceId = req.params.spaceId;
  const pageId = req.params.pageId;
  let locale = req.params.locale;
  const spaceRef = await firestoreService.doc(`spaces/${spaceId}`).get();
  if (!spaceRef.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new https.HttpsError('not-found', 'Space not found'));
    return;
  }
  const space = spaceRef.data() as Space;
  if (!space.locales.some((it) => it.id === locale)) {
    locale = space.localeFallback.id;
  }
  bucket.file(`spaces/${spaceId}/pages/${pageId}/${locale}.json`).download()
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
