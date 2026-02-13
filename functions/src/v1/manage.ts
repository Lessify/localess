import { Router } from 'express';
import { logger } from 'firebase-functions/v2';

export const MANAGE = Router();

// Manage API
MANAGE.post('/api/v1/spaces/:spaceId/translations/:locale', async (req, res) => {
  logger.info('v1 spaces translations update params : ' + JSON.stringify(req.params));
});
