import express from 'express';
import cors from 'cors';
import os from 'os';
import sharp from 'sharp';
import { logger } from 'firebase-functions';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { Query } from 'firebase-admin/firestore';
import { bucket, CACHE_ASSET_MAX_AGE, CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, firestoreService } from './config';
import { AssetFile } from './models/asset.model';
import { Content, ContentKind, ContentLink } from './models/content.model';
import { Space } from './models/space.model';
import { findContentByFullSlug } from './services/content.service';
import { findSpaceById } from './services/space.service';
import { findTokenById, validateToken } from './services/token.service';

// API V1
const expressApp = express();
expressApp.use(cors({ origin: true }));

expressApp.get('/api/v1/spaces/:spaceId/translations/:locale', async (req, res) => {
  logger.info('v1 spaces translations params : ' + JSON.stringify(req.params));
  logger.info('v1 spaces translations query : ' + JSON.stringify(req.query));
  const { spaceId, locale } = req.params;
  const { cv } = req.query;

  const cachePath = `spaces/${spaceId}/translations/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces translations cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      res.redirect(`/api/v1/spaces/${spaceId}/translations/${locale}?cv=${metadata.generation}`);
      return;
    } else {
      const spaceSnapshot = await findSpaceById(spaceId).get();
      if (!spaceSnapshot.exists) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .send(new HttpsError('not-found', 'Space not found'));
        return;
      }
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some(it => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      bucket
        .file(`spaces/${spaceId}/translations/${actualLocale}.json`)
        .download()
        .then(content => {
          res
            .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
            .contentType('application/json')
            .send(content.toString());
        })
        .catch(() => {
          res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
        });
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/links', async (req, res) => {
  logger.info('v1 spaces links params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces links query: ' + JSON.stringify(req.query));
  const { spaceId } = req.params;
  const { kind, startSlug, cv, token } = req.query;
  if (!validateToken(token)) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const tokenSnapshot = await findTokenById(spaceId, token?.toString() || '').get();
  if (!tokenSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const cachePath = `spaces/${spaceId}/contents/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces links cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/links?cv=${metadata.generation}`;
      if (kind !== undefined) {
        url += `&kind=${kind}`;
      }
      if (startSlug !== undefined) {
        url += `&startSlug=${startSlug}`;
      }
      if (token) {
        url += `&token=${token}`;
      }
      res.redirect(url);
      return;
    } else {
      let contentsQuery: Query = firestoreService.collection(`spaces/${spaceId}/contents`);
      if (kind) {
        contentsQuery = contentsQuery.where('kind', '==', kind);
      }
      if (startSlug) {
        contentsQuery = contentsQuery.where('fullSlug', '>=', startSlug).where('fullSlug', '<', `${startSlug}~`);
      }
      const contentsSnapshot = await contentsQuery.get();

      const response: Record<string, ContentLink> = contentsSnapshot.docs
        .map(contentSnapshot => {
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
        .reduce(
          (acc, item) => {
            acc[item.id] = item;
            return acc;
          },
          {} as Record<string, ContentLink>
        );
      res
        .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
        .contentType('application/json')
        .send(response);
      return;
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/contents/slugs/*', async (req, res) => {
  logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces content query: ' + JSON.stringify(req.query));
  logger.info('v1 spaces content url: ' + req.url);
  const { spaceId } = req.params;
  const { cv, locale, version, token } = req.query;
  const params: Record<string, string> = req.params;
  const fullSlug = params['0'];
  let contentId = '';
  if (!validateToken(token)) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const tokenSnapshot = await findTokenById(spaceId, token?.toString() || '').get();
  if (!tokenSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const contentsSnapshot = await findContentByFullSlug(spaceId, fullSlug).get();
  logger.info('v1 spaces contents', contentsSnapshot.size);
  if (contentsSnapshot.empty) {
    // No records in database
    res.status(404).send(new HttpsError('not-found', 'Slug not found'));
    return;
  } else {
    contentId = contentsSnapshot.docs[0].id;
  }

  let cachePath = `spaces/${spaceId}/contents/${contentId}/cache.json`;
  if (version === 'draft') {
    cachePath = `spaces/${spaceId}/contents/${contentId}/draft/cache.json`;
  }
  logger.info('v1 spaces content cachePath: ' + cachePath);
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/contents/slugs/${fullSlug}?cv=${metadata.generation}`;
      if (locale) {
        url += `&locale=${locale}`;
      }
      if (version) {
        url += `&version=${version}`;
      }
      if (token) {
        url += `&token=${token}`;
      }
      logger.info(`v1 spaces content redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some(it => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      let filePath = `spaces/${spaceId}/contents/${contentId}/${actualLocale}.json`;
      if (version === 'draft') {
        filePath = `spaces/${spaceId}/contents/${contentId}/draft/${actualLocale}.json`;
      }
      bucket
        .file(filePath)
        .download()
        .then(content => {
          res
            .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
            .contentType('application/json')
            .send(content.toString());
        })
        .catch(() => {
          res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
        });
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/contents/:contentId', async (req, res) => {
  logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces content query: ' + JSON.stringify(req.query));
  const { spaceId, contentId } = req.params;
  const { cv, locale, version, token } = req.query;
  if (!validateToken(token)) {
    logger.info('v1 spaces content Token Not Valid string: ' + token);
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    logger.info('v1 spaces content Space not exist: ' + spaceId);
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const tokenSnapshot = await findTokenById(spaceId, token?.toString() || '').get();
  if (!tokenSnapshot.exists) {
    logger.info('v1 spaces content Token not exist: ' + token);
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  let cachePath = `spaces/${spaceId}/contents/${contentId}/cache.json`;
  if (version === 'draft') {
    cachePath = `spaces/${spaceId}/contents/${contentId}/draft/cache.json`;
  }
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/contents/${contentId}?cv=${metadata.generation}`;
      if (locale) {
        url += `&locale=${locale}`;
      }
      if (version) {
        url += `&version=${version}`;
      }
      if (token) {
        url += `&token=${token}`;
      }
      logger.info(`v1 spaces content redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some(it => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      let filePath = `spaces/${spaceId}/contents/${contentId}/${actualLocale}.json`;
      if (version === 'draft') {
        filePath = `spaces/${spaceId}/contents/${contentId}/draft/${actualLocale}.json`;
      }
      bucket
        .file(filePath)
        .download()
        .then(content => {
          res
            .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
            .contentType('application/json')
            .send(content.toString());
        })
        .catch(() => {
          res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
        });
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/assets/:assetId', async (req, res) => {
  logger.info('v1 spaces asset params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces asset query: ' + JSON.stringify(req.query));
  const { spaceId, assetId } = req.params;
  const { w: width, download } = req.query;

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  const [exists] = await assetFile.exists();
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  logger.info(`v1 spaces asset: ${exists} & ${assetSnapshot.exists}`);
  if (exists && assetSnapshot.exists) {
    const asset = assetSnapshot.data() as AssetFile;
    const tempFilePath = `${os.tmpdir()}/assets-${assetId}`;
    let filename = `${asset.name}${asset.extension}`;
    // apply resize for valid 'w' parameter and images
    if (width && !Number.isNaN(width) && asset.type.startsWith('image/') && asset.type !== 'image/svg+xml') {
      filename = `${asset.name}-w${width}${asset.extension}`;
      const [file] = await assetFile.download();
      await sharp(file).resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
    } else {
      await assetFile.download({ destination: tempFilePath });
    }
    let disposition = `inline; filename="${filename}"`;
    if (download !== undefined) {
      disposition = `form-data; filename="${filename}"`;
    }
    res
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`)
      .header('Content-Disposition', disposition)
      .contentType(asset.type)
      .sendFile(tempFilePath);
    return;
  } else {
    res.status(404).header('Cache-Control', 'no-cache').send(new HttpsError('not-found', 'Not found.'));
    return;
  }
});

export const v1 = onRequest(expressApp);
