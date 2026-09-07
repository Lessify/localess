/**
 * The three provisioning steps the Firebase CLI has no command for.
 *
 * This is the ONLY file that reaches into `firebase-tools` internals. Those
 * imports are not public API, so keeping them in one place means a breaking
 * change upstream is a single-file fix. Verified against firebase-tools 15.29.0:
 *
 *   - API enablement    no `firebase services:enable` command exists
 *   - Billing linking   no `firebase billing:*` commands exist
 *   - Default bucket    `gcp/storage.js` only reads the bucket, never creates it
 *
 * Only two internals are used: `apiv2.Client` (an authenticated HTTP client
 * carrying the `cloud-platform` scope) and `ensureApiEnabled`. Billing goes
 * through plain REST rather than `gcp/cloudbilling.js`, whose retry policy does
 * not tolerate API-enablement propagation — see `withPropagationRetry`.
 *
 * Auth is deliberately absent: since 15.29.0 the `auth` block in firebase.json
 * plus `firebase deploy --only auth` provisions Identity Platform and the
 * providers, so it goes through `firebase-cli.mjs` like any other command.
 */
import { firebaseTools } from './firebase-tools.mjs';

let internals;

/**
 * Bootstraps firebase-tools' auth, then builds the internal handles.
 *
 * The bootstrap is essential: `apiv2` keeps the refresh token in a module-level
 * variable that only the CLI's own command wrapper populates. Without calling
 * `requireAuth` first, every request fails with "not yet authenticated" even
 * though the user is logged in. `requireAuth` also requests the
 * `cloud-platform` scope and falls back to application default credentials.
 */
async function init() {
  const { load } = firebaseTools();
  const auth = load('lib/auth.js');
  const { requireAuth } = load('lib/requireAuth.js');
  const { Client } = load('lib/apiv2.js');

  const options = {};
  const account = auth.getGlobalDefaultAccount();
  if (account) {
    auth.setActiveAccount(options, account);
  }
  await requireAuth(options);

  return {
    ensureApiEnabled: load('lib/ensureApiEnabled.js'),
    cloudBilling: new Client({
      urlPrefix: 'https://cloudbilling.googleapis.com',
      apiVersion: 'v1',
    }),
    firebaseStorage: new Client({
      urlPrefix: 'https://firebasestorage.googleapis.com',
      apiVersion: 'v1beta',
    }),
  };
}

/**
 * Resolved on first use rather than at import time, so a missing or outdated
 * firebase-tools surfaces as a preflight error instead of an import crash.
 */
function api() {
  internals ??= init();
  return internals;
}

/**
 * Distinguishes "the API I just enabled is still propagating" from a real
 * failure. Both arrive as `400 FAILED_PRECONDITION / Precondition check
 * failed`, so the only reliable signal is the absence of a concrete violation:
 * a quota or permission problem carries a `details` entry naming it, whereas
 * propagation carries none.
 */
function isPropagating(res) {
  if (res.status !== 400 && res.status !== 403) return false;
  const details = res.body?.error?.details ?? [];
  return !details.some(detail => /QuotaFailure|PreconditionFailure|ErrorInfo/.test(detail['@type'] ?? ''));
}

/** Retries a request while a just-enabled API is still propagating. */
async function withPropagationRetry(request, { attempts = 6, delayMs = 5000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await request();
    if (!isPropagating(res) || attempt === attempts) return res;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

function fail(action, res) {
  return new Error(`${action}: ${res.status} ${JSON.stringify(res.body)}`);
}

/** Forces the auth bootstrap so preflight can fail early and clearly. */
export async function authenticate() {
  await api();
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enables a single API, polling until it reports ENABLED. Idempotent.
 *
 * Retries when Service Usage still believes the project is on Spark. Freshly
 * linked billing takes up to a minute to propagate there, so the Blaze-gated
 * APIs (run, eventarc, ...) can be rejected immediately after a successful
 * link. firebase-tools raises this as a plain FirebaseError with no
 * machine-readable cause, so the message is the only signal available.
 */
export async function enableApi(projectId, apiName, { attempts = 8, delayMs = 10000 } = {}) {
  const { ensureApiEnabled } = await api();

  for (let attempt = 1; ; attempt++) {
    try {
      return await ensureApiEnabled.ensure(projectId, apiName, 'setup', true);
    } catch (error) {
      const billingNotVisibleYet = /Blaze/.test(error?.message ?? '');
      if (!billingNotVisibleYet || attempt === attempts) throw error;
      await sleep(delayMs);
    }
  }
}

export async function isBillingEnabled(projectId) {
  const { cloudBilling } = await api();
  await enableApi(projectId, 'cloudbilling.googleapis.com');

  const res = await withPropagationRetry(() => cloudBilling.get(`/projects/${projectId}/billingInfo`, { resolveOnHTTPError: true }));
  if (res.status >= 400) throw fail('Could not read billing info', res);
  return res.body?.billingEnabled === true;
}

/** Billing accounts the user can actually link (open ones only). */
export async function listOpenBillingAccounts() {
  const { cloudBilling } = await api();
  const res = await withPropagationRetry(() => cloudBilling.get('/billingAccounts', { resolveOnHTTPError: true }));
  if (res.status >= 400) throw fail('Could not list billing accounts', res);
  return (res.body?.billingAccounts ?? []).filter(account => account.open);
}

export async function linkBillingAccount(projectId, billingAccountName) {
  const { cloudBilling } = await api();
  const res = await cloudBilling.put(`/projects/${projectId}/billingInfo`, { billingAccountName }, { resolveOnHTTPError: true });
  if (res.status >= 400) throw fail('Could not link billing account', res);
  return res.body?.billingEnabled === true;
}

/**
 * The API returns a resource name like
 * `projects/<id>/buckets/<id>.appspot.com`; callers only want the bucket id.
 */
function bucketName(body) {
  const resource = body?.bucket?.name ?? body?.name;
  return resource ? resource.split('/').pop() : null;
}

/** The project's default Storage bucket, or `null` when none exists yet. */
export async function getDefaultBucket(projectId) {
  const { firebaseStorage } = await api();
  const res = await firebaseStorage.get(`/projects/${projectId}/defaultBucket`, {
    resolveOnHTTPError: true,
  });
  if (res.status === 404) return null;
  if (res.status >= 400) throw fail('Could not read default bucket', res);
  return bucketName(res.body);
}

/**
 * Creates the default Storage bucket and links it to the Firebase project.
 * Treats "already exists" as success so the step stays re-runnable.
 */
export async function createDefaultBucket(projectId, location) {
  const { firebaseStorage } = await api();
  const res = await withPropagationRetry(() =>
    firebaseStorage.post(`/projects/${projectId}/defaultBucket`, { location }, { resolveOnHTTPError: true }),
  );
  if (res.status === 409) return getDefaultBucket(projectId);
  if (res.status >= 400) throw fail('Could not create default bucket', res);
  return bucketName(res.body);
}
