import { Response } from 'express';
import { HttpsError } from 'firebase-functions/v2/https';
import { TokenPermission } from '../models';

/**
 * Sends a generic 401 response for a missing token, a malformed token, or a
 * well-formed token that doesn't exist. The message is intentionally the
 * same in all three cases so it never reveals whether a given token ID exists.
 * @param {Response} res - Express response
 * @return {void}
 */
export function sendUnauthenticated(res: Response): void {
  res.status(401).send(new HttpsError('unauthenticated', 'Missing or invalid API token'));
}

/**
 * Sends a 403 response naming the permission(s) that would have satisfied
 * the check and, optionally, why they're required for this request.
 * @param {Response} res - Express response
 * @param {TokenPermission[]} requiredPermissions - Permissions that would have satisfied the check
 * @param {string} [reason] - Context-specific explanation of why these permissions are required
 * @return {void}
 */
export function sendPermissionDenied(res: Response, requiredPermissions: TokenPermission[], reason?: string): void {
  res.status(403).send(
    new HttpsError('permission-denied', 'Token is missing a required permission', {
      requiredPermissions,
      reason,
      hint: 'Add one of the required permissions to this token, or use a token that already has it.',
    })
  );
}
