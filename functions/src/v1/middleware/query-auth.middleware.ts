import { NextFunction, Request, Response } from 'express';
import { HttpsError } from 'firebase-functions/v2/https';
import { Token, TokenPermission } from '../../models';
import { findTokenById, validateToken } from '../../services';
import { canPerformAny } from '../../utils/api-auth-utils';

/**
 * Extended Express Request with token information
 */
export interface RequestWithToken extends Request {
  token?: Token;
  tokenId?: string;
}

interface TokenCacheEntry {
  token: Token;
  expiresAt: number;
}

// In-memory token cache scoped to the single Function instance (maxInstances: 1).
// Tokens are short-lived (5 min TTL) to pick up revocations quickly while
// drastically reducing Firestore reads during traffic spikes.
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Returns a cached token or fetches it from Firestore, caching the result for TOKEN_CACHE_TTL_MS.
 * Returns null when the token does not exist.
 * @param {string} spaceId - The space ID the token belongs to
 * @param {string} tokenId - The token ID to look up
 * @return {Promise<Token | null>} The token or null if not found
 */
async function getCachedToken(spaceId: string, tokenId: string): Promise<Token | null> {
  const cacheKey = `${spaceId}:${tokenId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }
  const tokenSnapshot = await findTokenById(spaceId, tokenId).get();
  if (!tokenSnapshot.exists) {
    tokenCache.delete(cacheKey);
    return null;
  }
  const token = tokenSnapshot.data() as Token;
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
  return token;
}

/**
 * Middleware factory that creates an authentication middleware checking for specific token permissions
 * @param {TokenPermission[]} requiredPermissions - List of permissions that the token must have
 * @return {Function} Express middleware function
 */
export function requireTokenPermissions(requiredPermissions: TokenPermission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { spaceId } = req.params;
    const { token: tokenId } = req.query;

    // Validate token format
    if (!validateToken(tokenId)) {
      res.status(401).send(new HttpsError('unauthenticated', 'Invalid or missing token'));
      return;
    }

    // Validate spaceId exists
    if (!spaceId) {
      res.status(400).send(new HttpsError('invalid-argument', 'Space ID is required'));
      return;
    }

    try {
      // Fetch token from cache or Firestore
      const token = await getCachedToken(spaceId, tokenId as string);

      if (!token) {
        res.status(401).send(new HttpsError('unauthenticated', 'Token not found'));
        return;
      }

      // Check if token has any of the required permissions
      const hasPermission = canPerformAny(requiredPermissions, token);

      if (!hasPermission) {
        res
          .status(403)
          .send(new HttpsError('permission-denied', `Token does not have required permissions: ${requiredPermissions.join(', ')}`));
        return;
      }

      // Attach token and tokenId to request for use in route handlers
      (req as RequestWithToken).token = token;
      (req as RequestWithToken).tokenId = tokenId as string;

      next();
    } catch (error) {
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

/**
 * Middleware for content endpoints that checks permissions based on version query parameter
 * Published content (no version) requires PUBLIC or DRAFT permission
 * Draft content (with version) requires DRAFT permission
 * @return {Function} Express middleware function
 */
export function requireContentPermissions() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { spaceId } = req.params;
    const { token: tokenId, version } = req.query;

    // Validate token format
    if (!validateToken(tokenId)) {
      res.status(401).send(new HttpsError('unauthenticated', 'Invalid or missing token'));
      return;
    }

    // Validate spaceId exists
    if (!spaceId) {
      res.status(400).send(new HttpsError('invalid-argument', 'Space ID is required'));
      return;
    }

    try {
      // Fetch token from cache or Firestore
      const token = await getCachedToken(spaceId, tokenId as string);

      if (!token) {
        res.status(401).send(new HttpsError('unauthenticated', 'Token not found'));
        return;
      }

      // Check permissions: version requires DRAFT, published (no version) requires PUBLIC or DRAFT
      const hasRequiredPermission =
        version !== undefined
          ? canPerformAny([TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS], token)
          : canPerformAny([TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS], token);

      if (!hasRequiredPermission) {
        res
          .status(403)
          .send(
            new HttpsError(
              'permission-denied',
              version !== undefined ? 'Draft content requires DRAFT permission' : 'Published content requires PUBLIC or DRAFT permission'
            )
          );
        return;
      }

      // Attach token and tokenId to request for use in route handlers
      (req as RequestWithToken).token = token;
      (req as RequestWithToken).tokenId = tokenId as string;

      next();
    } catch (error) {
      res.status(500).send(new HttpsError('internal', 'Failed to verify token'));
    }
  };
}

/**
 * Middleware for translation endpoints that checks permissions based on version query parameter
 * Published translation (no version) requires PUBLIC or DRAFT permission
 * Draft translation (with version) requires DRAFT permission
 * @return {Function} Express middleware function
 */
export function requireTranslationPermissions() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { spaceId } = req.params;
    const { token: tokenId, version } = req.query;

    // Validate token format
    if (!validateToken(tokenId)) {
      res.status(401).send(new HttpsError('unauthenticated', 'Invalid or missing token'));
      return;
    }

    // Validate spaceId exists
    if (!spaceId) {
      res.status(400).send(new HttpsError('invalid-argument', 'Space ID is required'));
      return;
    }

    try {
      // Fetch token from cache or Firestore
      const token = await getCachedToken(spaceId, tokenId as string);

      if (!token) {
        res.status(401).send(new HttpsError('unauthenticated', 'Token not found'));
        return;
      }

      // Check permissions: version requires DRAFT, published (no version) requires PUBLIC or DRAFT
      const hasRequiredPermission =
        version !== undefined
          ? canPerformAny([TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS], token)
          : canPerformAny([TokenPermission.TRANSLATION_PUBLIC, TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS], token);

      if (!hasRequiredPermission) {
        res
          .status(403)
          .send(
            new HttpsError(
              'permission-denied',
              version !== undefined
                ? 'Draft translation requires DRAFT permission'
                : 'Published translation requires PUBLIC or DRAFT permission'
            )
          );
        return;
      }

      // Attach token and tokenId to request for use in route handlers
      (req as RequestWithToken).token = token;
      (req as RequestWithToken).tokenId = tokenId as string;

      next();
    } catch (error) {
      res.status(500).send(new HttpsError('internal', 'Failed to verify token'));
    }
  };
}
