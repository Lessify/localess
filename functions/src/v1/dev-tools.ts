import { Router } from 'express';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE } from '../config';
import { Schema, Space, Token, TokenPermission } from '../models';
import { findSchemas, findSpaceById, findTokenById, generateOpenApi, validateToken } from '../services';
import { canPerform } from '../utils/api-auth-utils';

export const DEV_TOOLS = Router();

DEV_TOOLS.get('/api/v1/spaces/:spaceId', async (req, res) => {
  logger.info('v1 spaces params : ' + JSON.stringify(req.params));
  logger.info('v1 spaces query : ' + JSON.stringify(req.query));
  const { spaceId } = req.params;
  const { token } = req.query;

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
  const space = spaceSnapshot.data() as Space;

  const tokenSnapshot = await findTokenById(spaceId, token?.toString() || '').get();
  if (!tokenSnapshot.exists) {
    res
      .status(401)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('unauthenticated', 'Unauthenticated'));
    return;
  }
  const tokenData = tokenSnapshot.data() as Token;
  if (
    !canPerform(TokenPermission.PUBLIC, tokenData) &&
    !canPerform(TokenPermission.DRAFT, tokenData) &&
    !canPerform(TokenPermission.DEV_TOOLS, tokenData)
  ) {
    res
      .status(403)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('permission-denied', 'Permission denied'));
    return;
  }

  res.json({
    id: spaceSnapshot.id,
    name: space.name,
    locales: space.locales,
    localeFallback: space.localeFallback,
    createdAt: space.createdAt.toDate().toISOString(),
    updatedAt: space.updatedAt.toDate().toISOString(),
  });
});

DEV_TOOLS.get('/api/v1/spaces/:spaceId/open-api', async (req, res) => {
  logger.info('v1 spaces content params: ' + JSON.stringify(req.params));
  logger.info('v1 spaces content query: ' + JSON.stringify(req.query));
  const { spaceId } = req.params;
  const { token } = req.query;
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
    res
      .status(401)
      .header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_SHARE_MAX_AGE}`)
      .send(new HttpsError('unauthenticated', 'Unauthenticated'));
    return;
  }
  const tokenData = tokenSnapshot.data() as Token;

  if (!canPerform(TokenPermission.DEV_TOOLS, tokenData)) {
    res.status(403).send(new HttpsError('permission-denied', 'Permission denied'));
    return;
  }
  const schemasSnapshot = await findSchemas(spaceId).get();
  const schemaById = new Map<string, Schema>(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
  res.json(generateOpenApi(schemaById));
});
