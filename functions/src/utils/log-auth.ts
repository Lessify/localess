/**
 * The caller identity to put in a log line.
 *
 * Never log `request.auth` itself: in firebase-functions v2 it carries `rawToken`, the caller's
 * live ID token, which anyone with Logs Viewer could replay as that user until it expires.
 *
 * @param {object | undefined} auth `request.auth` of a callable
 * @return {string} the caller's uid, or `anonymous` for an unauthenticated call
 */
export function authUid(auth?: { uid?: string } | null): string {
  return auth?.uid || 'anonymous';
}
