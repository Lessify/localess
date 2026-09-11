/**
 * The Google Cloud APIs Localess needs, and the check that they are on.
 *
 * Shared because both commands need the same answer for different reasons: setup turns
 * them on while provisioning, and deploy re-checks because the project may have been
 * provisioned by an older release, had an API disabled by hand, or drifted in any of the
 * ways a long-lived cloud project does. A missing API surfaces as a failure partway
 * through a deploy otherwise - after the build, and worded in terms of the resource that
 * could not be created rather than the API that was off.
 */
import { enableApi, listEnabledApis } from './firebase-gaps.mjs';

/**
 * `firebase deploy` auto-enables most of the Functions ones, but not all — notably
 * Translate, which is only used at runtime by functions/src/services/translate.service.ts.
 * Nothing in a deploy touches it, so without this list it would stay off until the feature
 * failed in production.
 */
export const REQUIRED_APIS = Object.freeze([
  'firebase.googleapis.com',
  'firebasehosting.googleapis.com',
  'firebaserules.googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebaseextensions.googleapis.com',
  'cloudfunctions.googleapis.com',
  'cloudbuild.googleapis.com',
  'artifactregistry.googleapis.com',
  'run.googleapis.com',
  'eventarc.googleapis.com',
  'pubsub.googleapis.com',
  'storage.googleapis.com',
  'translate.googleapis.com',
]);

/**
 * The required APIs absent from `enabled`, in the order they are declared above.
 *
 * `enabled` of `null` means the list could not be read, which reads as "assume none are
 * on": enabling an API that already is costs one idempotent call, whereas skipping one
 * that is off costs a failed deploy.
 */
export function missingApis(enabled) {
  if (!enabled) return [...REQUIRED_APIS];
  const names = enabled instanceof Set ? enabled : new Set(enabled);
  return REQUIRED_APIS.filter(api => !names.has(api));
}

/**
 * Enables whatever is missing, and says so. Returns the APIs it had to turn on.
 *
 * One read, then a write per missing API - so the common case, a project that is already
 * correct, costs a single round trip in both setup and deploy.
 */
export async function ensureRequiredApis(projectId, log) {
  log.step(`Checking ${REQUIRED_APIS.length} required APIs`);

  const missing = missingApis(await listEnabledApis(projectId));
  if (missing.length === 0) {
    log.skip(`all ${REQUIRED_APIS.length} are enabled`);
    return missing;
  }

  for (const apiName of missing) {
    await enableApi(projectId, apiName);
    log.done(`enabled ${apiName}`);
  }
  return missing;
}
