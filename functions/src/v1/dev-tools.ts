import { Router } from 'express';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE } from '../config';
import { Schema, Space, TokenPermission } from '../models';
import { findSchemas, findSpaceById, generateOpenApi } from '../services';
import { requireTokenPermissions, RequestWithToken } from './middleware';

// eslint-disable-next-line new-cap
export const DEV_TOOLS = Router();

DEV_TOOLS.get('/api/v1/spaces/:spaceId', requireTokenPermissions([TokenPermission.DEV_TOOLS]), async (req: RequestWithToken, res) => {
  logger.info('v1 spaces params : ' + JSON.stringify(req.params));
  logger.info('v1 spaces query : ' + JSON.stringify(req.query));
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
    logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
    logger.info('v1 spaces content query: ' + JSON.stringify(req.query));
    const { spaceId } = req.params;

    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (!spaceSnapshot.exists) {
      logger.info('v1 spaces content Space not exist: ' + spaceId);
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
