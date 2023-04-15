import * as express from 'express';
import * as cors from 'cors';
import {https, logger} from 'firebase-functions';
import {bucket, CACHE_ASSET_MAX_AGE, CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, firestoreService} from './config';
import {Space} from './models/space.model';
import {Content, ContentKind, ContentLink} from './models/content.model';
import {Query} from 'firebase-admin/firestore';
import {AssetFile} from './models/asset.model';
import * as os from 'os';
import * as sharp from 'sharp';
import {findSpaceById} from './services/space.service';
import {findContentByFullSlug} from './services/content.service';

// API V1
const expressV1 = express();
expressV1.use(cors({origin: true}));

expressV1.get('/api/v1/spaces/:spaceId/translations/:locale', async (req, res) => {
  logger.info('v1 spaces translations params : ' + JSON.stringify(req.params));
  logger.info('v1 spaces translations query : ' + JSON.stringify(req.query));
  const {spaceId, locale} = req.params;
  const {version} = req.query;

  const cachePath = `spaces/${spaceId}/translations/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces translations cache meta : ' + JSON.stringify(metadata));
    if (version === undefined || version != metadata.generation) {
      res.redirect(`/api/v1/spaces/${spaceId}/translations/${locale}?version=${metadata.generation}`);
      return;
    } else {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      if (!spaceSnapshot.exists) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .send(new https.HttpsError('not-found', 'Space not found'));
        return;
      }
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some((it) => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      bucket.file(`spaces/${spaceId}/translations/${actualLocale}.json`).download()
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
    }
  } else {
    res
      .status(404)
      .send(new https.HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressV1.get('/api/v1/spaces/:spaceId/links', async (req, res) => {
  logger.info('v1 spaces links params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces links query: ' + JSON.stringify(req.query));
  const {spaceId} = req.params;
  const {kind, startSlug, version} = req.query;

  const cachePath = `spaces/${spaceId}/contents/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces links cache meta : ' + JSON.stringify(metadata));
    if (version === undefined || version != metadata.generation) {
      let redirectLink = `/api/v1/spaces/${spaceId}/links?version=${metadata.generation}`;
      if (kind !== undefined) {
        redirectLink += `&kind=${kind}`;
      }
      if (startSlug !== undefined) {
        redirectLink += `&startSlug=${startSlug}`;
      }
      res.redirect(redirectLink);
      return;
    } else {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      if (!spaceSnapshot.exists) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .send(new https.HttpsError('not-found', 'Space not found'));
        return;
      }
      let contentsQuery: Query = firestoreService.collection(`spaces/${spaceId}/contents`);
      if (kind) {
        contentsQuery = contentsQuery.where('kind', '==', kind);
      }
      if (startSlug) {
        contentsQuery = contentsQuery
          .where('fullSlug', '>=', startSlug)
          .where('fullSlug', '<', `${startSlug}~`);
      }
      const contentsSnapshot = await contentsQuery.get();

      const response: Record<string, ContentLink> = contentsSnapshot.docs
        .map((contentSnapshot) => {
          const content = contentSnapshot.data() as Content;
          const link: ContentLink = {
            id: contentSnapshot.id,
            kind: content.kind,
            name: content.name,
            slug: content.slug,
            fullSlug: content.fullSlug,
            parentSlug: content.parentSlug,
            createdAt: content.createdAt.toDate().toISOString(),
            updatedAt: content.updatedAt.toDate().toISOString(),
          };
          if (content.kind === ContentKind.DOCUMENT) {
            link.publishedAt = content.publishedAt?.toDate().toISOString();
          }
          return link;
        })
        .reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, ({} as Record<string, ContentLink>));
      res
        .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
        .contentType('application/json')
        .send(response);
      return;
    }
  } else {
    res
      .status(404)
      .send(new https.HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressV1.get('/api/v1/spaces/:spaceId/contents/slugs/*', async (req, res) => {
  logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces content url: ' + req.url);
  const {spaceId} = req.params;
  const {version, locale} = req.query;
  const params: Record<string, string> = req.params;
  const fullSlug = params['0'];
  let contentId = '';

  const contentsSnapshot = await findContentByFullSlug(spaceId, fullSlug).get();
  logger.info('v1 spaces contents', contentsSnapshot.size);
  if (contentsSnapshot.empty) {
    // No records in database
    res
      .status(404)
      .send(new https.HttpsError('not-found', 'Slug not found'));
    return;
  } else {
    contentId = contentsSnapshot.docs[0].id;
  }

  const cachePath = `spaces/${spaceId}/contents/${contentId}/cache.json`;
  logger.info('v1 spaces content cachePath: ' + cachePath);
  const [exists] = await bucket.file(cachePath).exists();


  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
    if (version === undefined || version != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/contents/slugs/${fullSlug}?version=${metadata.generation}`;
      if (locale) {
        url = `${url}&locale=${locale}`;
      }
      logger.info(`v1 spaces content redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      if (!spaceSnapshot.exists) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .send(new https.HttpsError('not-found', 'Space not found'));
        return;
      }
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some((it) => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      bucket.file(`spaces/${spaceId}/contents/${contentId}/${actualLocale}.json`).download()
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
    }
  } else {
    res
      .status(404)
      .send(new https.HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressV1.get('/api/v1/spaces/:spaceId/contents/:contentId', async (req, res) => {
  logger.info('v1 spaces content: ' + JSON.stringify(req.params));
  const {spaceId, contentId} = req.params;
  const {version, locale} = req.query;

  const cachePath = `spaces/${spaceId}/contents/${contentId}/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
    if (version === undefined || version != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/contents/${contentId}?version=${metadata.generation}`;
      if (locale) {
        url = `${url}&locale=${locale}`;
      }
      logger.info(`v1 spaces content redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      if (!spaceSnapshot.exists) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .send(new https.HttpsError('not-found', 'Space not found'));
        return;
      }
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some((it) => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      bucket.file(`spaces/${spaceId}/contents/${contentId}/${actualLocale}.json`).download()
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
    }
  } else {
    res
      .status(404)
      .send(new https.HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressV1.get('/api/v1/spaces/:spaceId/assets/:assetId', async (req, res) => {
  logger.info('v1 spaces asset params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces asset query: ' + JSON.stringify(req.query));
  const {spaceId, assetId} = req.params;
  const {w: width} = req.query;

  const assetPath = `spaces/${spaceId}/assets/${assetId}/original`;
  const [exists] = await bucket.file(assetPath).exists();
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  logger.info(`v1 spaces asset: ${exists} & ${assetSnapshot.exists}`);
  if (exists && assetSnapshot.exists) {
    const asset = assetSnapshot.data() as AssetFile;
    const tempFilePath = `${os.tmpdir()}/${asset.name}${asset.extension}`;
    let filename = `${asset.name}${asset.extension}`;
    if (width && !Number.isNaN(width)) {
      filename = `${asset.name}-w${width}${asset.extension}`;
      const [file] = await bucket.file(assetPath).download();
      await sharp(file).resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
    } else {
      await bucket.file(assetPath).download({destination: tempFilePath});
    }
    res
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`)
      .header('Content-Disposition', `inline; filename="${filename}"`)
      .contentType(asset.type)
      .sendFile(tempFilePath);
    return;
  } else {
    res
      .status(404)
      .header('Cache-Control', 'no-cache')
      .send(new https.HttpsError('not-found', 'Asset not found.'));
    return;
  }
});

export const v1 = https.onRequest(expressV1);
