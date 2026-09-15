import { Router } from 'express';
import { Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import os from 'os';
import {
  bucket,
  CACHE_ASSET_MAX_AGE,
  CACHE_ASSET_NOT_FOUND_MAX_AGE,
  CACHE_BAD_REQUEST_MAX_AGE,
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
import {
  applySharpTransforms,
  canonicalTransformSize,
  decodedAnimationPixels,
  isAnimatedPages,
  MAX_ANIMATED_PIXELS,
  parseAssetTransformQuery,
  resolveOutputFormat,
  sourceEncoderFormat,
} from '../utils/image-transform';
import { getSharp } from '../utils/lazy-modules';
import { buildAssetETag } from '../utils/asset-etag';
import { buildAssetQuery, findTransformParam } from '../utils/asset-query';
import { buildContentDisposition } from '../utils/content-disposition';
import { redactQuery } from '../utils/log-redact';
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
  logger.info('[V1:Translations] query : ' + redactQuery(req.query));
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
    logger.info('[V1:Links] query: ' + redactQuery(req.query));
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
  logger.info('[V1:ContentBySlug] query: ' + redactQuery(req.query));
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
  logger.info('[V1:ContentById] query: ' + redactQuery(req.query));
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
  logger.info('[V1:AssetById] query: ' + redactQuery(req.query));
  const { spaceId, assetId } = req.params;

  const parsed = parseAssetTransformQuery(req.query);
  if (!parsed.ok) {
    // Cached so a bad URL cannot repeatedly re-enter the function — the rejection is
    // a pure function of the query, so recomputing it gains nothing. Short TTL, since
    // the accepted value set can grow with a deploy.
    res
      .status(400)
      .header('Cache-Control', `public, max-age=${CACHE_BAD_REQUEST_MAX_AGE}, s-maxage=${CACHE_BAD_REQUEST_MAX_AGE}`)
      .send(new HttpsError('invalid-argument', parsed.error.message));
    return;
  }
  const { quality, fit, thumbnail } = parsed.query;

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  // One Storage metadata round-trip serves both purposes: existence, and the `md5Hash`
  // the ETag below is built from. Mirrors the `exists()`/`getMetadata()` merge already
  // applied to the content path (see docs/billing.md decision log, 2026-05).
  let objectMetadata: Record<string, unknown> | undefined;
  try {
    [objectMetadata] = await assetFile.getMetadata();
  } catch {
    objectMetadata = undefined;
  }
  const exists = objectMetadata !== undefined;
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  let overwriteType: string | undefined;
  logger.info(`[V1:AssetById] asset: ${exists} & ${assetSnapshot.exists}`);
  if (exists && assetSnapshot.exists) {
    const asset = assetSnapshot.data() as AssetFile;
    // A request larger than the source redirects to the size the source can actually produce,
    // rather than upscaling or being silently served at a different size. Redirecting rather
    // than clamping is what keeps one URL to one response: every oversized spelling collapses
    // onto the same canonical URL instead of returning identical bytes under many. Same idea
    // as the `cv` redirect above.
    const canonical = canonicalTransformSize(parsed.query, {
      width: asset.metadata?.width,
      height: asset.metadata?.height,
    });
    if (canonical.width !== parsed.query.width || canonical.height !== parsed.query.height) {
      const target = `/api/v1/spaces/${spaceId}/assets/${assetId}${buildAssetQuery({ ...parsed.query, ...canonical })}`;
      logger.info(`[V1:AssetById] canonical redirect => ${target}`);
      res.header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`).redirect(target);
      return;
    }
    const { width, height } = canonical;
    const format = resolveOutputFormat({
      requested: parsed.query.format,
      sourceType: asset.type,
      quality,
      resizing: width !== undefined || height !== undefined,
    });
    // What the pipeline encodes to, as opposed to what the *response* is labelled as. A resize
    // with no `?f=` still has to re-encode, and it should hand back what it was given — so the
    // source's own encoder is the target. `format` stays undefined there, which is what keeps
    // the content type and filename extension unchanged.
    const encodeAs = format ?? sourceEncoderFormat(asset.type);
    const tempFilePath = `${os.tmpdir()}/assets-${assetId}`;
    // Set by the branches where sharp produces the response, so those never touch `/tmp`.
    // `/tmp` on Cloud Functions is tmpfs — RAM against the instance limit — so writing the
    // output there and reading it straight back with `sendFile` held every transformed image
    // in memory twice. The passthrough branches below still use `tempFilePath`; converting
    // those is the deferred video-streaming work.
    let output: Buffer | undefined;
    let filename = `${asset.name}${asset.extension}`;
    const formatMimeMap: Record<string, string> = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif' };
    const formatExtMap: Record<string, string> = { webp: '.webp', jpeg: '.jpg', png: '.png', avif: '.avif' };
    const outputType: string | undefined = format ? formatMimeMap[format] : undefined;
    const outputExt: string = format ? formatExtMap[format] : asset.extension;

    // Drives the download filename, so it names what the *caller* asked for.
    const suffix = [width ? `w${width}` : '', height ? `h${height}` : '', format ? `f${format}` : '', fit ? `fit${fit}` : '']
      .filter(Boolean)
      .join('-');

    // The ETag has to describe the **bytes**, not the request. Two requests that resolve to the
    // same encode must share a tag; two that resolve differently must never collide. So this is
    // built from the *effective* encode — `encodeAs` and the resolved quality — rather than from
    // the raw query, which fixes two collisions:
    //
    //  - a bare request re-encodes now, so an empty suffix would render as `orig` and clash with
    //    the `/original` route, which returns genuinely different bytes;
    //  - `q` never appeared here at all, so `?w=400&q=10` and `?w=400&q=90` shared a tag and could
    //    serve each other a wrong `304`.
    //
    // A passthrough leaves `encodeAs` undefined and carries no params, so it still renders as
    // `orig` — which is exactly right, because those bytes *are* the stored file.
    const etagSuffix = [
      width ? `w${width}` : '',
      height ? `h${height}` : '',
      quality !== undefined ? `q${quality}` : '',
      encodeAs ? `f${encodeAs}` : '',
      fit ? `fit${fit}` : '',
    ]
      .filter(Boolean)
      .join('-');

    // Answered before any download or sharp work: a revalidating client should cost a
    // metadata read, not a re-encode.
    const md5Hash = objectMetadata?.['md5Hash'] as string | undefined;
    if (md5Hash) {
      const etag = buildAssetETag(md5Hash, etagSuffix, thumbnail);
      res.header('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        res.status(304).header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`).end();
        return;
      }
    }

    // Did the caller ask for anything, or is this a bare URL?
    const explicitTransform = width !== undefined || height !== undefined || format !== undefined || thumbnail;
    // A still raster we have an encoder for is normalised to that encoder's default quality even
    // with no parameters — a q95 camera export off a CMS upload form measured 587 KB, and the same
    // JPEG at the default came back 219 KB, a 63% saving with no format change. Quality is a
    // platform concern; format stays the developer's call, which is why only `?f=` can change it.
    //
    // `sourceEncoderFormat` is what scopes this: it maps jpeg/png/webp/avif and nothing else, so
    // GIF, SVG, TIFF and video fall out automatically. GIF is deliberately excluded rather than
    // mapped — it is palette-based, so re-encoding it gains roughly nothing.
    const normalisable = sourceEncoderFormat(asset.type) !== undefined;

    // Reject an oversized animation *before* paying to download it, when the stored metadata knows
    // how many frames it has. The authoritative check still runs after the download — assets
    // uploaded before `pages` was recorded have nothing to check here — but for everything else
    // this turns a full download plus probe into a rejection off one Firestore read.
    //
    // `thumbnail` is excluded deliberately: it decodes only the first frame, so the budget that
    // bounds a whole-animation decode does not apply to it.
    if (explicitTransform && !thumbnail && asset.metadata && 'pages' in asset.metadata) {
      const storedPixels = decodedAnimationPixels(asset.metadata.width, asset.metadata.height, asset.metadata.pages);
      if (storedPixels > MAX_ANIMATED_PIXELS) {
        logger.info(`[V1:AssetById] animation rejected before download: ${storedPixels} pixels`);
        res
          .status(400)
          .header('Cache-Control', `public, max-age=${CACHE_BAD_REQUEST_MAX_AGE}, s-maxage=${CACHE_BAD_REQUEST_MAX_AGE}`)
          .send(
            new HttpsError(
              'invalid-argument',
              `Animation is too large to transform: ${asset.metadata.width}x${asset.metadata.height} over ` +
                `${asset.metadata.pages} frames is ${storedPixels} pixels, above the ${MAX_ANIMATED_PIXELS} limit. ` +
                "Request '?thumbnail' for a still frame."
            )
          );
        return;
      }
    }

    if (asset.type.startsWith('image/') && (explicitTransform || normalisable)) {
      const sharp = await getSharp();
      if (asset.type === 'image/webp' || asset.type === 'image/gif') {
        // possible animated or single frame webp/gif
        const [file] = await assetFile.download();
        const probe = await sharp(file).metadata();
        const isAnimated = isAnimatedPages(probe.pages);
        if (thumbnail) {
          // An explicit request for a still, so collapse to the first frame whatever the source.
          const thumbnailSuffix = suffix ? `${suffix}-thumbnail` : 'thumbnail';
          filename = `${asset.name}-${thumbnailSuffix}${outputExt}`;
          const sharpFile = applySharpTransforms(sharp(file, { page: 0, pages: 1, autoOrient: true }), {
            width,
            height,
            quality,
            format: encodeAs,
            fit,
          });
          output = await sharpFile.toBuffer();
          overwriteType = outputType;
        } else if (isAnimated && !explicitTransform) {
          // A bare URL on an animation serves the stored bytes. Re-encoding one is the most
          // expensive thing this endpoint can do — every frame decoded on each cache miss — and
          // the pixel budget below would turn a plain `<img src>` on a large GIF into a `400`,
          // leaving it undisplayable. Optimising an animation stays explicit: `?f=webp` measured
          // at 4% of the source GIF, which is where the win actually is.
          //
          // The bytes are already in hand from the probe, so this costs no second download.
          output = file;
          filename = `${asset.name}${asset.extension}`;
        } else if (isAnimated) {
          // Resizing decodes every frame at once, so the budget is the whole animation rather
          // than one frame — see MAX_ANIMATED_PIXELS. `probe` already carries the page count, so
          // the guard costs nothing beyond the metadata read that detected the animation.
          const frameHeight = probe.pageHeight ?? probe.height ?? 0;
          const decodedPixels = decodedAnimationPixels(probe.width, frameHeight, probe.pages);
          if (decodedPixels > MAX_ANIMATED_PIXELS) {
            res
              .status(400)
              .header('Cache-Control', `public, max-age=${CACHE_BAD_REQUEST_MAX_AGE}, s-maxage=${CACHE_BAD_REQUEST_MAX_AGE}`)
              .send(
                new HttpsError(
                  'invalid-argument',
                  `Animation is too large to transform: ${probe.width}x${frameHeight} over ${probe.pages} frames is ` +
                    `${decodedPixels} pixels, above the ${MAX_ANIMATED_PIXELS} limit. Request '?thumbnail' for a still frame.`
                )
              );
            return;
          }
          if (suffix) {
            filename = `${asset.name}-${suffix}${outputExt}`;
          }
          const sharpFile = applySharpTransforms(sharp(file, { animated: true, autoOrient: true }), {
            width,
            height,
            quality,
            format: encodeAs,
            fit,
          });
          output = await sharpFile.toBuffer();
          overwriteType = outputType;
        } else {
          if (suffix) {
            filename = `${asset.name}-${suffix}${outputExt}`;
          }
          const sharpFile = applySharpTransforms(sharp(file, { autoOrient: true }), {
            width,
            height,
            quality,
            format: encodeAs,
            fit,
          });
          output = await sharpFile.toBuffer();
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
        const pipeline = applySharpTransforms(sharp(file, { autoOrient: true }), { width, height, quality, format: encodeAs, fit });
        output = await pipeline.toBuffer();
        overwriteType = outputType;
      }
    } else if (asset.type.startsWith('video/') && width !== undefined && thumbnail) {
      const sharp = await getSharp();
      await assetFile.download({ destination: tempFilePath });
      await extractThumbnail(tempFilePath, `screenshot-${assetId}.webp`);
      await applySharpTransforms(sharp(`${os.tmpdir()}/screenshot-${assetId}.webp`, { autoOrient: true }), {
        width,
        height,
        quality,
        format: encodeAs,
        fit,
      }).toFile(tempFilePath);
      overwriteType = format ? formatMimeMap[format] : 'image/webp';
      filename = `${asset.name}-${suffix || `w${width}`}-thumbnail${format ? formatExtMap[format] : '.webp'}`;
    } else {
      await assetFile.download({ destination: tempFilePath });
    }
    res
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`)
      .header('Content-Disposition', buildContentDisposition(filename, false))
      .contentType(overwriteType || asset.type);
    if (output) {
      res.send(output);
    } else {
      res.sendFile(tempFilePath);
    }
    return;
  } else {
    // Two different failures reach here, and caching them alike is a trap.
    //
    // No Firestore document means the asset genuinely does not exist — a deleted asset still
    // referenced by published content, or a bad ID. That repeats on every page view, so it is
    // worth caching hard.
    //
    // A document that exists while the Storage object does not means an upload is still in
    // flight (`AssetFile.inProgress`). Caching that would pin a 404 over an asset that is
    // about to appear — for a week, at the current TTL — so it stays uncached.
    if (assetSnapshot.exists) {
      res.status(404).header('Cache-Control', 'no-cache').send(new HttpsError('not-found', 'Not found, upload may still be in progress.'));
      return;
    }
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_NOT_FOUND_MAX_AGE}, s-maxage=${CACHE_ASSET_NOT_FOUND_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found.'));
    return;
  }
}); // The stored bytes, untouched. These exist because the transform route above does **not** return
// them: a still raster is re-encoded at its encoder's default quality even with no parameters, so
// `GET /assets/:id` is a normalised rendition rather than the uploaded file. These two routes are
// the escape hatch for when the actual bytes are wanted — archival, print, downstream processing —
// and they are also a different cost class: no sharp, no transform query, and the pair a redirect
// to Storage can eventually serve without proxying bytes at all.
CDN.get(['/api/v1/spaces/:spaceId/assets/:assetId/original', '/api/v1/spaces/:spaceId/assets/:assetId/download'], async (req, res) => {
  // One handler, two paths: they differ only in disposition, and duplicating forty lines of
  // lookup to vary a single header would be worse than branching on the path here.
  const attachment = req.path.endsWith('/download');
  const tag = attachment ? '[V1:AssetDownload]' : '[V1:AssetOriginal]';
  logger.info(tag + ' params: ' + JSON.stringify(req.params));
  logger.info(tag + ' query: ' + redactQuery(req.query));
  const { spaceId, assetId } = req.params;

  // These routes apply no transform, so a transform parameter is a caller error rather than
  // something to ignore — the same rule `parseAssetTransformQuery` follows for `fit=squish`.
  const offending = findTransformParam(req.query);
  if (offending !== undefined) {
    res
      .status(400)
      .header('Cache-Control', `public, max-age=${CACHE_BAD_REQUEST_MAX_AGE}, s-maxage=${CACHE_BAD_REQUEST_MAX_AGE}`)
      .send(
        new HttpsError(
          'invalid-argument',
          `Unsupported '${offending}' parameter on this route. It serves the stored bytes and applies no transform. ` +
            'Use GET /api/v1/spaces/{spaceId}/assets/{assetId} for transforms.'
        )
      );
    return;
  }

  const assetFile = bucket.file(`spaces/${spaceId}/assets/${assetId}/original`);
  // One Storage metadata round-trip serves both purposes: existence, and the `md5Hash` the ETag
  // below is built from — same merge the transform route above applies.
  let objectMetadata: Record<string, unknown> | undefined;
  try {
    [objectMetadata] = await assetFile.getMetadata();
  } catch {
    objectMetadata = undefined;
  }
  const exists = objectMetadata !== undefined;
  const assetSnapshot = await firestoreService.doc(`spaces/${spaceId}/assets/${assetId}`).get();
  logger.info(`${tag} asset: ${exists} & ${assetSnapshot.exists}`);

  if (!exists || !assetSnapshot.exists) {
    // The same two-flavour 404 as the transform route: a document without a Storage object is an
    // upload still in flight, and caching that would pin a 404 over an asset about to appear.
    if (assetSnapshot.exists) {
      res.status(404).header('Cache-Control', 'no-cache').send(new HttpsError('not-found', 'Not found, upload may still be in progress.'));
      return;
    }
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_ASSET_NOT_FOUND_MAX_AGE}, s-maxage=${CACHE_ASSET_NOT_FOUND_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found.'));
    return;
  }

  const asset = assetSnapshot.data() as AssetFile;
  // `orig` is the suffix reserved for the stored bytes, which is what keeps this tag distinct
  // from the transform route's — that one always carries its encode target. Answered before the
  // download, so a revalidating client costs a metadata read rather than a transfer.
  const md5Hash = objectMetadata?.['md5Hash'] as string | undefined;
  if (md5Hash) {
    const etag = buildAssetETag(md5Hash, '', false);
    res.header('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`).end();
      return;
    }
  }

  // A distinct path from the transform route's `assets-${assetId}`. That route writes
  // *transformed* output there on the video-thumbnail branch, so sharing the path would let a
  // concurrent request for the same asset serve the wrong bytes.
  //
  // `sendFile` rather than a stream because it implements Range requests, and a video here is
  // exactly where a client resumes a partial transfer. Streaming is not the fix for the tmpfs
  // cost — a redirect to Storage is, because GCS handles Range natively.
  const tempFilePath = `${os.tmpdir()}/assets-stored-${assetId}`;
  await assetFile.download({ destination: tempFilePath });

  res
    .header('Cache-Control', `public, max-age=${CACHE_ASSET_MAX_AGE}, s-maxage=${CACHE_ASSET_MAX_AGE}`)
    .header('Content-Disposition', buildContentDisposition(`${asset.name}${asset.extension}`, attachment))
    .contentType(asset.type)
    .sendFile(tempFilePath);
});
