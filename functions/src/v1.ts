import cors from 'cors';
import express from 'express';
import { Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import os from 'os';
import sharp from 'sharp';
import { bucket, CACHE_ASSET_MAX_AGE, CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, firestoreService, TEN_MINUTES } from './config';
import { AssetFile, Content, ContentKind, ContentLink, Space } from './models';
import {
  contentCachePath,
  contentLocaleCachePath,
  extractThumbnail,
  findContentByFullSlug,
  findSpaceById,
  findTokenById,
  identifySpaceLocale,
  spaceContentCachePath,
  validateToken,
} from './services';

// API V1
const expressApp = express();
expressApp.use(cors({ origin: true }));

expressApp.get('/api/v1/spaces/:spaceId/translations/:locale', async (req, res) => {
  logger.info('v1 spaces translations params : ' + JSON.stringify(req.params));
  logger.info('v1 spaces translations query : ' + JSON.stringify(req.query));
  const { spaceId, locale } = req.params;
  const { cv, token } = req.query;

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

  const cachePath = `spaces/${spaceId}/translations/cache.json`;
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces translations cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/translations/${locale}?cv=${metadata.generation}`;
      if (token) {
        url += `&token=${token}`;
      }
      logger.info(`v1 spaces translate redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
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
            .contentType('application/json; charset=utf-8')
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
  const { kind, parentSlug, excludeChildren, cv, token } = req.query;
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
  const cachePath = spaceContentCachePath(spaceId);
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('v1 spaces links cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/links?cv=${metadata.generation}`;
      if (parentSlug !== undefined) {
        url += `&parentSlug=${parentSlug}`;
      }
      if (excludeChildren === 'true') {
        url += `&excludeChildren=${excludeChildren}`;
      }
      if (kind === ContentKind.DOCUMENT || kind === ContentKind.FOLDER) {
        url += `&kind=${kind}`;
      }
      if (token) {
        url += `&token=${token}`;
      }
      res.redirect(url);
      return;
    } else {
      let contentsQuery: Query = firestoreService.collection(`spaces/${spaceId}/contents`);
      if (parentSlug) {
        if (excludeChildren === 'true') {
          contentsQuery = contentsQuery.where('parentSlug', '==', parentSlug);
        } else {
          contentsQuery = contentsQuery.where('parentSlug', '>=', parentSlug).where('parentSlug', '<', `${parentSlug}/~`);
        }
      } else {
        if (excludeChildren === 'true') {
          contentsQuery = contentsQuery.where('parentSlug', '==', '');
        }
      }
      if (kind && (kind === ContentKind.DOCUMENT || kind === ContentKind.FOLDER)) {
        contentsQuery = contentsQuery.where('kind', '==', kind);
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
        .contentType('application/json; charset=utf-8')
        .send(response);
      return;
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/contents/slugs/*slug', async (req, res) => {
  logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces content query: ' + JSON.stringify(req.query));
  logger.info('v1 spaces content url: ' + req.url);
  const { spaceId } = req.params;
  const { cv, locale, version, token } = req.query;
  const params: Record<string, unknown> = req.params;
  const slug = params['slug'] as string[];
  const fullSlug = slug.join('/');
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
  // logger.info('v1 spaces contents', contentsSnapshot.size);
  if (contentsSnapshot.empty) {
    // No records in database
    res.status(404).send(new HttpsError('not-found', 'Slug not found'));
    return;
  } else {
    contentId = contentsSnapshot.docs[0].id;
  }
  const cachePath = contentCachePath(spaceId, contentId, version as string | undefined);
  logger.info('v1 spaces content cachePath: ' + cachePath);
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    // logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
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
      const actualLocale = identifySpaceLocale(space, locale as string | undefined);
      logger.info(`v1 spaces content slug locale identified as => ${actualLocale}`);
      const filePath = contentLocaleCachePath(spaceId, contentId, actualLocale, version as string | undefined);
      bucket
        .file(filePath)
        .download()
        .then(content => {
          res
            .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
            .contentType('application/json; charset=utf-8')
            .send(content.toString());
        })
        .catch(() => {
          res
            .status(404)
            .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
            .send(new HttpsError('not-found', 'File not found, on path. Please Publish again.'));
        });
    }
  } else {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first.'));
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
  const cachePath = contentCachePath(spaceId, contentId, version as string | undefined);
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    // logger.info('v1 spaces content cache meta : ' + JSON.stringify(metadata));
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
      const actualLocale = identifySpaceLocale(space, locale as string | undefined);
      logger.info(`v1 spaces content id locale identified as => ${actualLocale}`);
      const filePath = contentLocaleCachePath(spaceId, contentId, actualLocale, version as string | undefined);
      bucket
        .file(filePath)
        .download()
        .then(content => {
          res
            .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
            .contentType('application/json; charset=utf-8')
            .send(content.toString());
        })
        .catch(() => {
          res
            .status(404)
            .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
            .send(new HttpsError('not-found', 'File not found, on path. Please Publish again.'));
        });
    }
  } else {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

expressApp.get('/api/v1/spaces/:spaceId/assets/:assetId', async (req, res) => {
  logger.info('v1 spaces asset params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces asset query: ' + JSON.stringify(req.query));
  const { spaceId, assetId } = req.params;
  const { w: width, download, thumbnail } = req.query;

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  const [exists] = await assetFile.exists();
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  let overwriteType: string | undefined;
  logger.info(`v1 spaces asset: ${exists} & ${assetSnapshot.exists}`);
  if (exists && assetSnapshot.exists) {
    const asset = assetSnapshot.data() as AssetFile;
    const tempFilePath = `${os.tmpdir()}/assets-${assetId}`;
    let filename = `${asset.name}${asset.extension}`;
    // apply resize for valid 'w' parameter and images
    if (asset.type.startsWith('image/') && width && !Number.isNaN(width)) {
      if (asset.type === 'image/webp' || asset.type === 'image/gif') {
        // possible animated or single frame webp/gif
        const [file] = await assetFile.download();
        let sharpFile = sharp(file);
        const sharpFileMetadata = await sharpFile.metadata();
        const isAnimated = sharpFileMetadata.pages !== undefined;
        if (thumbnail && isAnimated) {
          // Thumbnail with Animation: Remove animations, to reduce load
          filename = `${asset.name}-w${width}-thumbnail${asset.extension}`;
          sharpFile = sharp(file, { page: 0, pages: 1 });
          await sharpFile.resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
        } else if (thumbnail && !isAnimated) {
          // thumbnail without Animation
          filename = `${asset.name}-w${width}-thumbnail${asset.extension}`;
          // single frame webp/gif
          await sharpFile.resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
        } else {
          // Animated
          filename = `${asset.name}-w${width}${asset.extension}`;
          // animated webp/gif
          // TODO no way now to resize animated files
          await assetFile.download({ destination: tempFilePath });
        }
      } else if (asset.type === 'image/svg+xml') {
        // svg, cannot resize
        await assetFile.download({ destination: tempFilePath });
      } else {
        // other images
        filename = `${asset.name}-w${width}${asset.extension}`;
        const [file] = await assetFile.download();
        await sharp(file).resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
      }
    } else if (asset.type.startsWith('video/') && width && !Number.isNaN(width) && thumbnail) {
      await assetFile.download({ destination: tempFilePath });
      await extractThumbnail(tempFilePath, `screenshot-${assetId}.webp`);
      filename = `${asset.name}-w${width}-thumbnail.webp`;
      overwriteType = 'image/webp';
      await sharp(`${os.tmpdir()}/screenshot-${assetId}.webp`).resize(parseInt(width.toString(), 10)).toFile(tempFilePath);
    } else {
      await assetFile.download({ destination: tempFilePath });
    }
    let disposition = `inline; filename="${encodeURI(filename)}"`;
    if (download !== undefined) {
      disposition = `form-data; filename="${encodeURI(filename)}"`;
    }
    res
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`)
      .header('Content-Disposition', disposition)
      .contentType(overwriteType || asset.type)
      .sendFile(tempFilePath);
    return;
  } else {
    res.status(404).header('Cache-Control', 'no-cache').send(new HttpsError('not-found', 'Not found.'));
    return;
  }
});

export const v1 = onRequest({ memory: '512MiB' }, expressApp);
