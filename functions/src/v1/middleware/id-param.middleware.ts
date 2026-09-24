import { Router } from 'express';
import { HttpsError } from 'firebase-functions/v2/https';
import { CACHE_BAD_REQUEST_MAX_AGE } from '../../config';
import { isValidId } from '../../utils/id-param';

/** Route params that name a Firestore document or Storage folder. */
const ID_PARAMS = ['spaceId', 'contentId', 'assetId'];

/**
 * Rejects malformed IDs with `400` before any permission check or path builder sees them. Express
 * runs `router.param` callbacks ahead of the route's own middleware, so this also covers
 * `requireContentPermissions`, whose draft check only looks at the `version` query parameter.
 *
 * @param {Router} router a v1 router
 */
export function validateIdParams(router: Router): void {
  for (const name of ID_PARAMS) {
    router.param(name, (_req, res, next, value) => {
      if (isValidId(value)) {
        next();
        return;
      }
      res
        .status(400)
        .header('Cache-Control', `public, max-age=${CACHE_BAD_REQUEST_MAX_AGE}, s-maxage=${CACHE_BAD_REQUEST_MAX_AGE}`)
        .send(new HttpsError('invalid-argument', `Invalid '${name}'.`));
    });
  }
}
