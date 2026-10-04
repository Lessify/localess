import { Router } from 'express';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE } from '../config';
import { Schema, Space, TokenPermission, Translation } from '../models';
import { docSchemaToExport, findSchemas, findSpaceById, findTranslations, generateOpenApi, storedLocaleValues } from '../services';
import { redactQuery } from '../utils/log-redact';
import { RequestWithToken, requireTokenPermissions } from './middleware/query-auth.middleware';
import { validateIdParams } from './middleware/id-param.middleware';

// eslint-disable-next-line new-cap
export const DEV_TOOLS = Router();
validateIdParams(DEV_TOOLS);

DEV_TOOLS.get('/api/v1/spaces/:spaceId', requireTokenPermissions([TokenPermission.DEV_TOOLS]), async (req: RequestWithToken, res) => {
  logger.info('[V1:SpaceById] params : ' + JSON.stringify(req.params));
  logger.info('[V1:SpaceById] query : ' + redactQuery(req.query));
  const { spaceId } = req.params;

  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    res
      .status(404)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('not-found', 'Not found'));
    return;
  }
  const space = spaceSnapshot.data() as Space;

  res.json({
    id: spaceSnapshot.id,
    name: space.name,
    locales: space.locales,
    localeFallback: space.localeFallback,
    createdAt: space.createdAt.toDate().toISOString(),
    updatedAt: space.updatedAt.toDate().toISOString(),
  });
});

DEV_TOOLS.get(
  '/api/v1/spaces/:spaceId/open-api',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('[V1:OpenApi] params: ' + JSON.stringify(req.params));
    logger.info('[V1:OpenApi] query: ' + redactQuery(req.query));
    const { spaceId } = req.params;

    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (!spaceSnapshot.exists) {
      logger.info('[V1:OpenApi] Space not exist: ' + spaceId);
      res
        .status(404)
        .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
        .send(new HttpsError('not-found', 'Not found'));
      return;
    }

    const schemasSnapshot = await findSchemas(spaceId).get();
    const schemaById = new Map<string, Schema>(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
    res.json(generateOpenApi(schemaById));
  }
);

/**
 * The values stored for one locale, with no fallback filling: unlike the published translation
 * file, a key the locale has no value for is absent. Meant for round-tripping through files
 * (`localess translation pull --raw` → edit → push), where a fallback-filled file would write the
 * fallback language's text back as this locale's translation.
 */
DEV_TOOLS.get(
  '/api/v1/spaces/:spaceId/translations/:locale/values',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('[V1:TranslationValues] params: ' + JSON.stringify(req.params));
    logger.info('[V1:TranslationValues] query: ' + redactQuery(req.query));
    const { spaceId, locale } = req.params;

    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (!spaceSnapshot.exists) {
      logger.info('[V1:TranslationValues] Space not exist: ' + spaceId);
      res.status(404).header('Cache-Control', 'no-cache').send(new HttpsError('not-found', 'Not found'));
      return;
    }
    const space = spaceSnapshot.data() as Space;
    if (!space.locales.some(it => it.id === locale)) {
      res
        .status(400)
        .header('Cache-Control', 'no-cache')
        .send(new HttpsError('invalid-argument', 'Locale not supported by this space', `Locale ${locale} is not in space locales`));
      return;
    }

    const translationsSnapshot = await findTranslations(spaceId).get();
    const translations = new Map(translationsSnapshot.docs.map(it => [it.id, it.data() as Translation]));
    res.header('Cache-Control', 'no-cache').json(storedLocaleValues(translations, locale));
  }
);

DEV_TOOLS.get(
  '/api/v1/spaces/:spaceId/schemas',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('[V1:Schemas] params: ' + JSON.stringify(req.params));
    logger.info('[V1:Schemas] query: ' + redactQuery(req.query));
    const { spaceId } = req.params;

    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (!spaceSnapshot.exists) {
      logger.info('[V1:Schemas] Space not exist: ' + spaceId);
      res
        .status(404)
        .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
        .send(new HttpsError('not-found', 'Not found'));
      return;
    }

    const schemasSnapshot = await findSchemas(spaceId).get();
    res.json(schemasSnapshot.docs.map(it => docSchemaToExport(it.id, it.data() as Schema)));
  }
);
