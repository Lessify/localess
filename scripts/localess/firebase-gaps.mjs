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
 *   - Project labels    no `firebase projects:*` command reads or writes labels
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
    // v3 for reads and merging writes. Removing a label needs v1's full-resource PUT:
    // v3's `updateMask=labels` merges rather than replaces, and a per-key mask
    // (`labels.localess-managed`) is rejected because the key contains hyphens.
    resourceManager: new Client({
      urlPrefix: 'https://cloudresourcemanager.googleapis.com',
      apiVersion: 'v3',
    }),
    // v1 for listing: it returns the full project resource including labels, so one call
    // annotates the whole picker. v3's `projects.search` needs a parent or a query.
    resourceManagerV1: new Client({
      urlPrefix: 'https://cloudresourcemanager.googleapis.com',
      apiVersion: 'v1',
    }),
    // Reads which APIs are on. `ensureApiEnabled.check` answers the same question one API
    // at a time; this answers it for all of them in a single call.
    serviceUsage: new Client({
      urlPrefix: 'https://serviceusage.googleapis.com',
      apiVersion: 'v1',
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
/**
 * The names of every API enabled on a project, or `null` when they cannot be read.
 *
 * One call answers for all of them, which is why this exists rather than a loop over
 * `ensureApiEnabled.check`: the required set is 15 long and both setup and deploy consult
 * it, so per-API round trips would be the slowest thing either command does.
 *
 * Never throws. A caller that cannot read the list has to fall back to enabling everything,
 * which is idempotent anyway - failing a deploy because a *check* failed would be worse
 * than the drift it is looking for.
 */
export async function listEnabledApis(projectId) {
  try {
    const { serviceUsage } = await api();
    const names = new Set();

    let pageToken;
    do {
      const res = await withPropagationRetry(() =>
        serviceUsage.get(`/projects/${projectId}/services`, {
          queryParams: { filter: 'state:ENABLED', pageSize: 200, ...(pageToken ? { pageToken } : {}) },
          resolveOnHTTPError: true,
        }),
      );
      if (res.status >= 400) return null;

      for (const service of res.body?.services ?? []) {
        if (service.config?.name) names.add(service.config.name);
      }
      pageToken = res.body?.nextPageToken;
    } while (pageToken);

    return names;
  } catch {
    return null;
  }
}

export async function enableApi(projectId, apiName, { attempts = 8, delayMs = 10000 } = {}) {
  const { ensureApiEnabled } = await api();

  // `ensure` short-circuits on a configstore cache that records "this API was enabled" per
  // project and never expires. An API disabled after that point would therefore be reported
  // as enabled and never actually turned back on - which is precisely the drift the callers
  // of this function exist to correct. Dropping the entry first forces a real check.
  ensureApiEnabled.uncacheEnabledAPI(projectId, apiName);

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

/**
 * The GCP labels on a project, or `null` when they cannot be read.
 *
 * Never throws: this is used to decorate a project picker, where a project the user can
 * list but not describe must degrade to "unverified" rather than abort setup.
 */
export async function readProjectLabels(projectId) {
  try {
    const { resourceManager } = await api();
    const response = await resourceManager.get(`/projects/${projectId}`);
    return response.body?.labels ?? {};
  } catch {
    return null;
  }
}

/**
 * Merges labels into a project, leaving every other label untouched.
 *
 * `updateMask=labels` sends the whole map, so the existing labels are read first and
 * merged - otherwise Firebase's own `firebase: enabled` would be wiped.
 */
export async function mergeProjectLabels(projectId, labels) {
  const { resourceManager } = await api();
  const existing = (await readProjectLabels(projectId)) ?? {};
  const merged = { ...existing, ...labels };

  const unchanged = Object.entries(labels).every(([key, value]) => existing[key] === value);
  if (unchanged) return merged;

  await resourceManager.request({
    method: 'PATCH',
    path: `/projects/${projectId}`,
    queryParams: { updateMask: 'labels' },
    body: { labels: merged },
  });
  return merged;
}

/**
 * Labels for every project the account can see, keyed by project id.
 *
 * One call rather than one per project: Cloud Resource Manager's `projects.list` returns
 * the full resource, labels included, which `firebase projects:list` does not. That is
 * what makes it affordable to annotate an entire picker.
 *
 * Returns `null` when the listing fails, which the caller must treat as "unknown" rather
 * than "no projects are managed".
 */
export async function listAllProjectLabels() {
  try {
    const { resourceManagerV1 } = await api();
    const byProject = new Map();

    let pageToken;
    do {
      // apiv2 serialises an undefined query param as the string "undefined", which the
      // API rejects with a 400, so the token is only added once there is one.
      const queryParams = { pageSize: 200, ...(pageToken ? { pageToken } : {}) };
      const response = await resourceManagerV1.get('/projects', { queryParams });
      for (const project of response.body?.projects ?? []) {
        if (project.lifecycleState === 'ACTIVE') byProject.set(project.projectId, project.labels ?? {});
      }
      pageToken = response.body?.nextPageToken;
    } while (pageToken);

    return byProject;
  } catch {
    return null;
  }
}
