/**
 * The default Storage bucket's CORS configuration.
 *
 * The browser fetches assets straight from Storage, so without CORS rules on the bucket
 * those requests fail and downloads break. This used to be set by the `setup` callable in
 * functions/, which had two problems: it ran behind the `configs/setup` guard, so it fired
 * exactly once in a project's lifetime and could never be re-applied, and it read
 * `bucket.metadata.cors` on a handle whose metadata was never fetched - so the "already
 * configured" branch was unreachable and it rewrote the policy every time regardless.
 *
 * Here it is ordinary infrastructure, applied next to the bucket that setup creates and
 * re-checked on every deploy, like the required APIs.
 */
import { getBucketCors, getDefaultBucket, setBucketCors } from './firebase-gaps.mjs';

/** Read-only access from any origin: what serving assets to a browser needs, and no more. */
export const BUCKET_CORS = Object.freeze([
  Object.freeze({
    origin: Object.freeze(['*']),
    method: Object.freeze(['GET', 'HEAD']),
    maxAgeSeconds: 3600,
  }),
]);

/**
 * Whether the bucket still needs the default rules.
 *
 * Only an empty configuration counts. Any existing rule means someone chose it - the
 * console, Terraform, a tighter origin list for a locked-down install - and silently
 * replacing that with `origin: *` would widen access nobody asked to widen. This is the
 * rule the original guard meant to express before it was defeated by unfetched metadata.
 */
export function needsBucketCors(cors) {
  return Array.isArray(cors) && cors.length === 0;
}

/**
 * Applies the default CORS rules when the bucket has none.
 *
 * Best-effort: it needs `storage.buckets.update`, and an operator who lacks it should not
 * be blocked from provisioning an otherwise healthy project. Deploy re-runs this, so the
 * project heals itself once the role is granted.
 */
export async function ensureBucketCors(projectId, log) {
  log.step('Checking Storage CORS');

  const bucketName = await getDefaultBucket(projectId);
  if (!bucketName) {
    log.skip('no default bucket yet');
    return;
  }

  const cors = await getBucketCors(bucketName);
  if (cors === null) {
    log.warn(`could not read the CORS configuration of ${bucketName}`);
    return;
  }

  if (!needsBucketCors(cors)) {
    log.skip(`${bucketName} already has ${cors.length} CORS rule${cors.length === 1 ? '' : 's'}`);
    return;
  }

  try {
    await setBucketCors(bucketName, BUCKET_CORS);
    log.done(`${bucketName} now allows GET and HEAD from any origin`);
  } catch (error) {
    log.warn(`could not set CORS on ${bucketName} (${error.message})`);
    log.warn('asset downloads will fail in the browser until storage.buckets.update is granted');
  }
}
