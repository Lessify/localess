import { NextFunction, Request, Response } from 'express';
import { HttpsError } from 'firebase-functions/v2/https';
import { Token, TokenPermission } from '../../models';
import { findTokenById, validateToken } from '../../services';
import { sendPermissionDenied, sendUnauthenticated } from '../../utils/api-auth-errors';
import { canPerformAny } from '../../utils/api-auth-utils';

const AUTH_HEADER = 'X-API-KEY';
/**
 * Extended Express Request with token information
 */
export interface RequestWithToken extends Request {
  token?: Token;
  tokenId?: string;
}

/**
 * Middleware factory that creates an authentication middleware checking for specific token permissions
 * @param {TokenPermission[]} requiredPermissions - List of permissions that the token must have
 * @return {Function} Express middleware function
 */
export function requireTokenPermissions(requiredPermissions: TokenPermission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { spaceId } = req.params;
    const tokenId = req.header(AUTH_HEADER);

    // Validate token format
    if (!validateToken(tokenId)) {
      sendUnauthenticated(res);
      return;
    }

    // Validate spaceId exists
    if (!spaceId) {
      res.status(400).send(new HttpsError('invalid-argument', 'Space ID is required'));
      return;
    }

    try {
      // Fetch token from Firestore
      const tokenSnapshot = await findTokenById(spaceId, tokenId as string).get();

      if (!tokenSnapshot.exists) {
        sendUnauthenticated(res);
        return;
      }

      const token = tokenSnapshot.data() as Token;

      // Check if token has any of the required permissions
      const hasPermission = canPerformAny(requiredPermissions, token);

      if (!hasPermission) {
        sendPermissionDenied(res, requiredPermissions);
        return;
      }

      // Attach token and tokenId to request for use in route handlers
      (req as RequestWithToken).token = token;
      (req as RequestWithToken).tokenId = tokenId as string;

      next();
    } catch {
      res.status(500).send(new HttpsError('internal', 'Failed to verify token'));
    }
  };
}

/**
 * Middleware that checks for a single token permission
 * @param {TokenPermission} permission - The permission required
 * @return {Function} Express middleware function
 */
export function requireTokenPermission(permission: TokenPermission) {
  return requireTokenPermissions([permission]);
}
