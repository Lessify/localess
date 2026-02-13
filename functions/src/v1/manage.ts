import { Router } from 'express';
import { logger } from 'firebase-functions/v2';
import { TokenPermission, zTranslationUpdateSchema } from '../models';
import { requireTokenPermissions, RequestWithToken } from './middleware';
import { HttpsError } from 'firebase-functions/https';

// eslint-disable-next-line new-cap
export const MANAGE = Router();

// Manage API - Example usage of the auth middleware
MANAGE.post(
  '/api/v1/spaces/:spaceId/translations/:locale',
  requireTokenPermissions([TokenPermission.DRAFT, TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    logger.info('v1 spaces translations update params : ' + JSON.stringify(req.params));
    // req.token contains the validated token object
    // req.tokenId contains the token string
    const body = zTranslationUpdateSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).send(new HttpsError('invalid-argument', 'Bad request body', body.error));
    }
  }
);
