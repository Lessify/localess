import { Router } from 'express';
import { Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import os from 'os';
import sharp from 'sharp';
import { bucket, CACHE_ASSET_MAX_AGE, CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, firestoreService, TEN_MINUTES } from '../config';
import {
  AssetFile,
  Content,
  ContentDocumentApi,
  ContentDocumentStorage,
  ContentKind,
  ContentLink,
  Space,
  TokenPermission,
} from '../models';
import {
  contentLocaleCachePath,
  extractThumbnail,
  findContentByFullSlug,
  findSpaceById,
  identifySpaceLocale,
  resolveLinks,
  resolveReferences,
  spaceContentCachePath,
  spaceTranslationCachePath,
  translationLocaleCachePath,
} from '../services';
import {
  RequestWithToken,
  requireContentPermissions,
  requireTokenPermissions,
  requireTranslationPermissions,
} from './middleware/query-auth.middleware';

// eslint-disable-next-line new-cap
export const CDN = Router();

/**
 * Resolves the locale file path to use for a request.
 * Returns the primary path if the file exists, the fallback path if it does,
 * or null if neither exists.
 * @param {string} primaryPath The primary file path to check
 * @param {string} fallbackPath The fallback file path to check if the primary does not exist
 * @return {string | null} The resolved file path or null if neither exists
 */
async function resolveLocaleFilePath(primaryPath: string, fallbackPath: string): Promise<string | null> {
  const [primaryExists] = await bucket.file(primaryPath).exists();
  if (primaryExists) return primaryPath;
  if (primaryPath === fallbackPath) return null;
  const [fallbackExists] = await bucket.file(fallbackPath).exists();
  return fallbackExists ? fallbackPath : null;
}

CDN.get('/api/v1/spaces/:spaceId/translations/:locale', requireTranslationPermissions(), async (req: RequestWithToken, res) => {
  logger.info('[V1:Translations] params : ' + JSON.stringify(req.params));
  logger.info('[V1:Translations] query : ' + JSON.stringify(req.query));
  const { spaceId, locale } = req.params;
  const { cv, version } = req.query;
  const token = req.tokenId;

  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }

  const cachePath = spaceTranslationCachePath(spaceId);
  const [exists] = await bucket.file(cachePath).exists();
  if (exists) {
    const [metadata] = await bucket.file(cachePath).getMetadata();
    logger.info('[V1:Translations] cache meta : ' + JSON.stringify(metadata));
    if (cv === undefined || cv != metadata.generation) {
      let url = `/api/v1/spaces/${spaceId}/translations/${locale}?cv=${metadata.generation}`;
      if (version) {
        url += `&version=${version}`;
      }
      if (token) {
        url += `&token=${token}`;
      }
      logger.info(`[V1:Translations] redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const space = spaceSnapshot.data() as Space;
      let actualLocale = locale;
      if (!space.locales.some(it => it.id === locale)) {
        actualLocale = space.localeFallback.id;
      }
      const filePath = translationLocaleCachePath(spaceId, actualLocale, version as string | undefined);
      const fallbackFilePath = translationLocaleCachePath(spaceId, space.localeFallback.id, version as string | undefined);
      const resolvedPath = await resolveLocaleFilePath(filePath, fallbackFilePath);
      if (!resolvedPath) {
        res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
        return;
      }
      try {
        const [content] = await bucket.file(resolvedPath).download();
        res
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .contentType('application/json; charset=utf-8')
          .send(content.toString());
      } catch (e) {
        logger.error('[V1:Translations]', e);
        res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
      }
    }
  } else {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
});

CDN.get(
  '/api/v1/spaces/:spaceId/links',
  requireTokenPermissions([TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('[V1:Links] params: ' + JSON.stringify(req.params));
    logger.info('[V1:Links] query: ' + JSON.stringify(req.query));
    const { spaceId } = req.params;
    const { kind, parentSlug, excludeChildren, cv } = req.query;
    const token = req.tokenId;

    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (!spaceSnapshot.exists) {
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
      logger.info('[V1:Links] cache meta : ' + JSON.stringify(metadata));
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
  }
);

CDN.get('/api/v1/spaces/:spaceId/contents/slugs/*slug', requireContentPermissions(), async (req: RequestWithToken, res) => {
  logger.info('[V1:ContentBySlug] params: ' + JSON.stringify(req.params));
  logger.info('[V1:ContentBySlug] query: ' + JSON.stringify(req.query));
  const { spaceId } = req.params;
  const { cv, locale, version, resolveReference, resolveLink } = req.query;
  const token = req.tokenId;
  const params: Record<string, unknown> = req.params;
  const slug = params['slug'] as string[];
  const fullSlug = slug.join('/');
  let contentId = '';

  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }

  const contentsSnapshot = await findContentByFullSlug(spaceId, fullSlug).get();
  if (contentsSnapshot.empty) {
    // No records in database
    res.status(404).send(new HttpsError('not-found', 'Slug not found'));
    return;
  } else {
    contentId = contentsSnapshot.docs[0].id;
  }
  const cacheCheckPath = spaceContentCachePath(spaceId);
  const cacheCheckFile = bucket.file(cacheCheckPath);
  logger.info('[V1:ContentBySlug] cachePath: ' + cacheCheckPath);
  const [exists] = await cacheCheckFile.exists();
  if (exists) {
    const [metadata] = await cacheCheckFile.getMetadata();
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
      if (resolveReference) {
        url += `&resolveReference=${resolveReference}`;
      }
      if (resolveLink) {
        url += `&resolveLink=${resolveLink}`;
      }
      logger.info(`[V1:ContentBySlug] redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const space = spaceSnapshot.data() as Space;
      const actualLocale = identifySpaceLocale(space, locale as string | undefined);
      logger.info(`[V1:ContentBySlug] locale identified as => ${actualLocale}`);
      const filePath = contentLocaleCachePath(spaceId, contentId, actualLocale, version as string | undefined);
      const fallbackFilePath = contentLocaleCachePath(spaceId, contentId, space.localeFallback.id, version as string | undefined);
      const resolvedPath = await resolveLocaleFilePath(filePath, fallbackFilePath);
      if (!resolvedPath) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
          .send(new HttpsError('not-found', 'File not found, on path. Please Publish again. The content is cached for 10 minutes.'));
        return;
      }
      const resolvedLocale = resolvedPath === filePath ? actualLocale : space.localeFallback.id;
      try {
        const [content] = await bucket.file(resolvedPath).download();
        const contentData: ContentDocumentStorage = JSON.parse(content.toString());
        const { links, references, ...rest } = contentData;
        const response: ContentDocumentApi = { ...rest };
        if (resolveLink === 'true' && links && links.length > 0) {
          logger.info(`[V1:ContentBySlug] resolve links => ${JSON.stringify(links)}`);
          response.links = await resolveLinks(spaceId, contentData);
        }
        if (resolveReference === 'true' && references && references.length > 0) {
          logger.info(`[V1:ContentBySlug] resolve refs => ${JSON.stringify(references)}`);
          response.references = await resolveReferences(spaceId, contentData, resolvedLocale, version as string | undefined);
        }
        res
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .contentType('application/json; charset=utf-8')
          .send(response);
        return;
      } catch (e) {
        logger.error('[V1:ContentBySlug]', e);
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
          .send(new HttpsError('not-found', 'File not found, on path. Please Publish again. The content is cached for 10 minutes.'));
        return;
      }
    }
  } else {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first. The content is cached for 10 minutes.'));
    return;
  }
});

CDN.get('/api/v1/spaces/:spaceId/contents/:contentId', requireContentPermissions(), async (req: RequestWithToken, res) => {
  logger.info('[V1:ContentById] params: ' + JSON.stringify(req.params));
  logger.info('[V1:ContentById] query: ' + JSON.stringify(req.query));
  const { spaceId, contentId } = req.params;
  const { cv, locale, version, resolveReference, resolveLink } = req.query;
  const token = req.tokenId;

  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    logger.info('[V1:ContentById] Space not exist: ' + spaceId);
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }

  const cacheCheckPath = spaceContentCachePath(spaceId);
  const cacheCheckFile = bucket.file(cacheCheckPath);
  logger.info('[V1:ContentById] cachePath: ' + cacheCheckPath);
  const [exists] = await cacheCheckFile.exists();
  if (exists) {
    const [metadata] = await cacheCheckFile.getMetadata();
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
      if (resolveReference) {
        url += `&resolveReference=${resolveReference}`;
      }
      if (resolveLink) {
        url += `&resolveLink=${resolveLink}`;
      }
      logger.info(`[V1:ContentById] redirect to => ${url}`);
      res.redirect(url);
      return;
    } else {
      const space = spaceSnapshot.data() as Space;
      const actualLocale = identifySpaceLocale(space, locale as string | undefined);
      logger.info(`[V1:ContentById] locale identified as => ${actualLocale}`);
      const filePath = contentLocaleCachePath(spaceId, contentId, actualLocale, version as string | undefined);
      const fallbackFilePath = contentLocaleCachePath(spaceId, contentId, space.localeFallback.id, version as string | undefined);
      const resolvedPath = await resolveLocaleFilePath(filePath, fallbackFilePath);
      if (!resolvedPath) {
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
          .send(new HttpsError('not-found', 'File not found, on path. Please Publish again. The content is cached for 10 minutes.'));
        return;
      }
      const resolvedLocale = resolvedPath === filePath ? actualLocale : space.localeFallback.id;
      try {
        const [content] = await bucket.file(resolvedPath).download();
        const contentData: ContentDocumentStorage = JSON.parse(content.toString());
        const { links, references, ...rest } = contentData;
        const response: ContentDocumentApi = { ...rest };
        if (resolveLink === 'true' && links && links.length > 0) {
          logger.info(`[V1:ContentById] resolve links => ${JSON.stringify(links)}`);
          response.links = await resolveLinks(spaceId, contentData);
        }
        if (resolveReference === 'true' && references && references.length > 0) {
          logger.info(`[V1:ContentById] resolve refs => ${JSON.stringify(references)}`);
          response.references = await resolveReferences(spaceId, contentData, resolvedLocale, version as string | undefined);
        }
        res
          .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
          .contentType('application/json; charset=utf-8')
          .send(response);
        return;
      } catch (e) {
        logger.error('[V1:ContentById]', e);
        res
          .status(404)
          .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
          .send(new HttpsError('not-found', 'File not found, on path. Please Publish again. The content is cached for 10 minutes.'));
        return;
      }
    }
  } else {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first. The content is cached for 10 minutes.'));
    return;
  }
});

CDN.get('/api/v1/spaces/:spaceId/assets/:assetId', async (req, res) => {
  logger.info('[V1:AssetById] params: ' + JSON.stringify(req.params));
  logger.info('[V1:AssetById] query: ' + JSON.stringify(req.query));
  const { spaceId, assetId } = req.params;
  const { w: width, download, thumbnail } = req.query;

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  const [exists] = await assetFile.exists();
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  let overwriteType: string | undefined;
  logger.info(`[V1:AssetById] asset: ${exists} & ${assetSnapshot.exists}`);
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
