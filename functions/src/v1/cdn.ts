import { Router } from 'express';
import { Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import os from 'os';
import sharp from 'sharp';
import {
  bucket,
  CACHE_ASSET_MAX_AGE,
  CACHE_MAX_AGE,
  CACHE_REDIRECT_MAX_AGE_DEFAULT,
  CACHE_SHARE_MAX_AGE,
  firestoreService,
  TEN_MINUTES,
} from '../config';
import {
  AssetFile,
  Content,
  ContentDocumentApi,
  ContentDocumentStorage,
  ContentKind,
  ContentMetadata,
  isTokenV2,
  Space,
  TokenPermission,
} from '../models';
import {
  contentLocaleCachePath,
  extractThumbnail,
  findContentByFullSlug,
  findSpaceById,
  identifySpaceLocale,
  resolveAssets,
  resolveLinks,
  resolveReferences,
  spaceContentCachePath,
  spaceTranslationCachePath,
  translationLocaleCachePath,
} from '../services';
import { applySharpTransforms, ImageFormat, isImageFormat } from '../utils/image-transform';
import { resolveLocaleFilePath } from '../utils/locale-utils';
import {
  RequestWithToken,
  requireContentPermissions,
  requireTokenPermissions,
  requireTranslationPermissions,
} from './middleware/query-auth.middleware';

// eslint-disable-next-line new-cap
export const CDN = Router();

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
  let cacheMetadata: Record<string, unknown>;
  try {
    [cacheMetadata] = await bucket.file(cachePath).getMetadata();
  } catch {
    res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
    return;
  }
  logger.info('[V1:Translations] cache meta : ' + JSON.stringify(cacheMetadata));
  if (cv === undefined || cv != cacheMetadata['generation']) {
    let url = `/api/v1/spaces/${spaceId}/translations/${locale}?cv=${cacheMetadata['generation']}`;
    if (version) {
      url += `&version=${version}`;
    }
    if (token) {
      url += `&token=${token}`;
    }
    logger.info(`[V1:Translations] redirect to => ${url}`);
    const tokenCacheTtl = req.token && isTokenV2(req.token) ? req.token.cacheTtl : undefined;
    if (tokenCacheTtl === 0) {
      res.header('Cache-Control', 'no-cache').redirect(url);
    } else {
      const redirectAge = tokenCacheTtl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT;
      res.header('Cache-Control', `public, max-age=${redirectAge}, s-maxage=${redirectAge}`).redirect(url);
    }
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
    let cacheMetadata: Record<string, unknown>;
    try {
      [cacheMetadata] = await bucket.file(cachePath).getMetadata();
    } catch {
      res.status(404).send(new HttpsError('not-found', 'File not found, Publish first.'));
      return;
    }
    logger.info('[V1:Links] cache meta : ' + JSON.stringify(cacheMetadata));
    if (cv === undefined || cv != cacheMetadata['generation']) {
      let url = `/api/v1/spaces/${spaceId}/links?cv=${cacheMetadata['generation']}`;
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
      const tokenCacheTtl = req.token && isTokenV2(req.token) ? req.token.cacheTtl : undefined;
      if (tokenCacheTtl === 0) {
        res.header('Cache-Control', 'no-cache').redirect(url);
      } else {
        const redirectAge = tokenCacheTtl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT;
        res.header('Cache-Control', `public, max-age=${redirectAge}, s-maxage=${redirectAge}`).redirect(url);
      }
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

      const response: Record<string, ContentMetadata> = contentsSnapshot.docs
        .map(contentSnapshot => {
          const content = contentSnapshot.data() as Content;
          const link: ContentMetadata = {
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
          {} as Record<string, ContentMetadata>
        );
      res
        .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
        .contentType('application/json; charset=utf-8')
        .send(response);
      return;
    }
  }
);

CDN.get('/api/v1/spaces/:spaceId/contents/slugs/*slug', requireContentPermissions(), async (req: RequestWithToken, res) => {
  logger.info('[V1:ContentBySlug] params: ' + JSON.stringify(req.params));
  logger.info('[V1:ContentBySlug] query: ' + JSON.stringify(req.query));
  const { spaceId } = req.params;
  const { cv, locale, version, resolveReference, resolveLink, resolveAsset } = req.query;
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
  logger.info('[V1:ContentBySlug] cachePath: ' + cacheCheckPath);
  let cacheMetadata: Record<string, unknown>;
  try {
    [cacheMetadata] = await bucket.file(cacheCheckPath).getMetadata();
  } catch {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first. The content is cached for 10 minutes.'));
    return;
  }
  if (cv === undefined || cv != cacheMetadata['generation']) {
    let url = `/api/v1/spaces/${spaceId}/contents/slugs/${fullSlug}?cv=${cacheMetadata['generation']}`;
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
    if (resolveAsset) {
      url += `&resolveAsset=${resolveAsset}`;
    }
    logger.info(`[V1:ContentBySlug] redirect to => ${url}`);
    const tokenCacheTtl = req.token && isTokenV2(req.token) ? req.token.cacheTtl : undefined;
    if (tokenCacheTtl === 0) {
      res.header('Cache-Control', 'no-cache').redirect(url);
    } else {
      const redirectAge = tokenCacheTtl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT;
      res.header('Cache-Control', `public, max-age=${redirectAge}, s-maxage=${redirectAge}`).redirect(url);
    }
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
      const { assets, links, references, ...rest } = contentData;
      const response: ContentDocumentApi = { ...rest };
      if (resolveAsset === 'true' && assets && assets.length > 0) {
        logger.info(`[V1:ContentBySlug] resolve assets => ${JSON.stringify(assets)}`);
        response.assets = await resolveAssets(spaceId, contentData);
      }
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
});

CDN.get('/api/v1/spaces/:spaceId/contents/:contentId', requireContentPermissions(), async (req: RequestWithToken, res) => {
  logger.info('[V1:ContentById] params: ' + JSON.stringify(req.params));
  logger.info('[V1:ContentById] query: ' + JSON.stringify(req.query));
  const { spaceId, contentId } = req.params;
  const { cv, locale, version, resolveReference, resolveLink, resolveAsset } = req.query;
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
  logger.info('[V1:ContentById] cachePath: ' + cacheCheckPath);
  let cacheMetadata: Record<string, unknown>;
  try {
    [cacheMetadata] = await bucket.file(cacheCheckPath).getMetadata();
  } catch {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${TEN_MINUTES}, s-maxage=${TEN_MINUTES}`)
      .send(new HttpsError('not-found', 'File not found, Publish first. The content is cached for 10 minutes.'));
    return;
  }
  if (cv === undefined || cv != cacheMetadata['generation']) {
    let url = `/api/v1/spaces/${spaceId}/contents/${contentId}?cv=${cacheMetadata['generation']}`;
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
    if (resolveAsset) {
      url += `&resolveAsset=${resolveAsset}`;
    }
    logger.info(`[V1:ContentById] redirect to => ${url}`);
    const tokenCacheTtl = req.token && isTokenV2(req.token) ? req.token.cacheTtl : undefined;
    if (tokenCacheTtl === 0) {
      res.header('Cache-Control', 'no-cache').redirect(url);
    } else {
      const redirectAge = tokenCacheTtl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT;
      res.header('Cache-Control', `public, max-age=${redirectAge}, s-maxage=${redirectAge}`).redirect(url);
    }
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
      const { assets, links, references, ...rest } = contentData;
      const response: ContentDocumentApi = { ...rest };
      if (resolveAsset === 'true' && assets && assets.length > 0) {
        logger.info(`[V1:ContentById] resolve assets => ${JSON.stringify(assets)}`);
        response.assets = await resolveAssets(spaceId, contentData);
      }
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
});

CDN.get('/api/v1/spaces/:spaceId/assets/:assetId', async (req, res) => {
  logger.info('[V1:AssetById] params: ' + JSON.stringify(req.params));
  logger.info('[V1:AssetById] query: ' + JSON.stringify(req.query));
  const { spaceId, assetId } = req.params;
  const { w: widthRaw, h: heightRaw, q: qualityRaw, f: formatRaw, download, thumbnail } = req.query;
  const widthParsed = parseInt(widthRaw?.toString() ?? '', 10);
  const width = Number.isFinite(widthParsed) && widthParsed > 0 ? widthParsed : undefined;
  const heightParsed = parseInt(heightRaw?.toString() ?? '', 10);
  const height = Number.isFinite(heightParsed) && heightParsed > 0 ? heightParsed : undefined;
  const qualityParsed = parseInt(qualityRaw?.toString() ?? '', 10);
  const quality = Number.isFinite(qualityParsed) ? Math.min(100, Math.max(1, qualityParsed)) : 85;
  const rawFormatStr = formatRaw?.toString();
  const format: ImageFormat | undefined = isImageFormat(rawFormatStr) ? rawFormatStr : undefined;

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  const [exists] = await assetFile.exists();
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  let overwriteType: string | undefined;
  logger.info(`[V1:AssetById] asset: ${exists} & ${assetSnapshot.exists}`);
  if (exists && assetSnapshot.exists) {
    const asset = assetSnapshot.data() as AssetFile;
    const tempFilePath = `${os.tmpdir()}/assets-${assetId}`;
    let filename = `${asset.name}${asset.extension}`;
    const formatMimeMap: Record<string, string> = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif' };
    const formatExtMap: Record<string, string> = { webp: '.webp', jpeg: '.jpg', png: '.png', avif: '.avif' };
    const outputType: string | undefined = format ? formatMimeMap[format] : undefined;
    const outputExt: string = format ? formatExtMap[format] : asset.extension;

    const suffix = [width ? `w${width}` : '', height ? `h${height}` : '', format ? `f${format}` : ''].filter(Boolean).join('-');
    // apply resize for valid 'w' parameter and images
    if (asset.type.startsWith('image/') && (width !== undefined || height !== undefined || format !== undefined)) {
      if (asset.type === 'image/webp' || asset.type === 'image/gif') {
        // possible animated or single frame webp/gif
        const [file] = await assetFile.download();
        let sharpFile = sharp(file);
        const sharpFileMetadata = await sharpFile.metadata();
        const isAnimated = sharpFileMetadata.pages !== undefined;
        if (thumbnail) {
          const thumbnailSuffix = suffix ? `${suffix}-thumbnail` : 'thumbnail';
          filename = `${asset.name}-${thumbnailSuffix}${outputExt}`;
          if (isAnimated) {
            sharpFile = sharp(file, { page: 0, pages: 1 });
          }
          sharpFile = applySharpTransforms(sharpFile, { width, height, quality, format });
          await sharpFile.toFile(tempFilePath);
          overwriteType = outputType;
        } else if (isAnimated) {
          // TODO: no way to resize animated files
          filename = `${asset.name}${asset.extension}`;
          await assetFile.download({ destination: tempFilePath });
        } else {
          if (suffix) {
            filename = `${asset.name}-${suffix}${outputExt}`;
          }
          sharpFile = applySharpTransforms(sharpFile, { width, height, quality, format });
          await sharpFile.toFile(tempFilePath);
          overwriteType = outputType;
        }
      } else if (asset.type === 'image/svg+xml') {
        // svg, cannot resize
        await assetFile.download({ destination: tempFilePath });
      } else {
        // other images (jpeg, png, tiff, avif, …)
        if (suffix) {
          filename = `${asset.name}-${suffix}${outputExt}`;
        }
        const [file] = await assetFile.download();
        let pipeline = sharp(file);
        if (!format) {
          if (asset.type === 'image/jpeg') {
            pipeline = pipeline.jpeg({ quality });
          } else if (asset.type === 'image/webp') {
            pipeline = pipeline.webp({ quality });
          }
        }
        pipeline = applySharpTransforms(pipeline, { width, height, quality, format });
        await pipeline.toFile(tempFilePath);
        overwriteType = outputType;
      }
    } else if (asset.type.startsWith('video/') && width !== undefined && thumbnail) {
      await assetFile.download({ destination: tempFilePath });
      await extractThumbnail(tempFilePath, `screenshot-${assetId}.webp`);
      await applySharpTransforms(sharp(`${os.tmpdir()}/screenshot-${assetId}.webp`), { width, height, quality, format }).toFile(tempFilePath);
      overwriteType = format ? formatMimeMap[format] : 'image/webp';
      filename = `${asset.name}-${suffix || `w${width}`}-thumbnail${format ? formatExtMap[format] : '.webp'}`;
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
