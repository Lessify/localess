/**
 * What a finished Localess installation looks like, expressed as checks over facts.
 *
 * Everything here is pure: each function takes state that has already been fetched and
 * returns a verdict. The fetching, rendering and repairing live in
 * `commands/check.mjs`, which is what makes the interesting part testable without a
 * network or a project - the same split `prompts.mjs` uses for its validators.
 *
 * Three statuses, not two. `unknown` means the fact could not be read, and is deliberately
 * distinct from `missing`: the account may simply lack a role. Reporting "your bucket has
 * no CORS rules" because the read returned 403 would send someone chasing a problem that
 * is not there, and `--fix` must never act on it. This is the same rule `getBucketCors`
 * already follows by returning `null` rather than `[]`.
 */
import { missingApis, REQUIRED_APIS } from './apis.mjs';
import { needsBucketCors } from './bucket-cors.mjs';
import { MANAGED_LABEL, REGION_LABEL, VERSION_LABEL, hasMarker, markerRegion, markerVersion } from './markers.mjs';

export const OK = 'ok';
export const MISSING = 'missing';
export const UNKNOWN = 'unknown';

/** Report sections, in the order a project acquires them. */
export const INFRASTRUCTURE = 'Infrastructure';
export const DEPLOYMENT = 'Deployment';
export const APPLICATION = 'Application';

/**
 * The repairs `--fix` knows how to perform.
 *
 * Membership here is the whole safety rule: every one is idempotent, free, and reversible.
 * Anything that picks a permanent location (the Firestore database, the bucket), spends
 * money (billing), or pushes code (functions, auth providers) is deliberately absent and
 * carries a `hint` naming the command that does it.
 */
export const FIX_APIS = 'apis';
export const FIX_CORS = 'cors';
export const FIX_LABELS = 'labels';
export const FIX_LOCAL_FILES = 'localFiles';
export const FIX_INVOKERS = 'invokers';
export const FIX_ADMIN_USER = 'adminUser';

/**
 * The order repairs are applied in, which is a dependency order rather than a preference.
 *
 * `FIX_INVOKERS` must precede `FIX_ADMIN_USER`: creating the first admin calls the `setup`
 * callable, and a callable with no `allUsers` invoker binding is unreachable. Relying on
 * the order the checks happen to be declared in would make that correctness property an
 * accident of layout, so it is written down.
 */
export const FIX_ORDER = Object.freeze([FIX_APIS, FIX_CORS, FIX_LABELS, FIX_LOCAL_FILES, FIX_INVOKERS, FIX_ADMIN_USER]);

const result = (id, group, title, status, detail, { fix = null, hint = null } = {}) => ({
  id,
  group,
  title,
  status,
  detail,
  fix,
  hint,
});

/* -------------------------------------------------------------------------- */
/* Infrastructure                                                             */
/* -------------------------------------------------------------------------- */

/** Blaze is mandatory: Cloud Functions and Identity Platform both require it. */
export function checkBilling(billingEnabled, projectId) {
  if (billingEnabled === null || billingEnabled === undefined) {
    return result('billing', INFRASTRUCTURE, 'Billing', UNKNOWN, 'could not read the billing account');
  }
  if (billingEnabled) return result('billing', INFRASTRUCTURE, 'Billing', OK, 'Blaze plan active');

  return result('billing', INFRASTRUCTURE, 'Billing', MISSING, 'no billing account linked', {
    // Never auto-fixed: linking billing has cost implications, so it is never picked for
    // anyone. Setup refuses to guess for the same reason.
    hint: `link one at https://console.cloud.google.com/billing/linkedaccount?project=${projectId}`,
  });
}

export function checkApis(enabled) {
  if (!enabled) {
    return result('apis', INFRASTRUCTURE, 'Required APIs', UNKNOWN, 'could not list the enabled APIs');
  }
  const missing = missingApis(enabled);
  if (missing.length === 0) {
    return result('apis', INFRASTRUCTURE, 'Required APIs', OK, `${REQUIRED_APIS.length}/${REQUIRED_APIS.length} enabled`);
  }
  return result('apis', INFRASTRUCTURE, 'Required APIs', MISSING, `${missing.length} disabled: ${missing.join(', ')}`, {
    fix: FIX_APIS,
  });
}

/** The `(default)` database. Its location is immutable, so it is also the region oracle. */
export function checkFirestore(databases, projectId) {
  if (databases === null || databases === undefined) {
    return result('firestore', INFRASTRUCTURE, 'Firestore', UNKNOWN, 'could not list the databases');
  }
  const existing = databases.find(database => database.name?.endsWith('/databases/(default)'));
  if (existing) {
    return result('firestore', INFRASTRUCTURE, 'Firestore', OK, `(default) in ${existing.locationId}`);
  }
  return result('firestore', INFRASTRUCTURE, 'Firestore', MISSING, 'no (default) database', {
    // Creating it fixes a location that can never be changed. That is setup's decision to
    // take, behind setup's region prompt - not a side effect of a check.
    hint: `npm run localess:setup -- --project ${projectId}`,
  });
}

export function checkBucket(bucketName, projectId) {
  if (bucketName === undefined) {
    return result('bucket', INFRASTRUCTURE, 'Storage bucket', UNKNOWN, 'could not read the default bucket');
  }
  if (bucketName) return result('bucket', INFRASTRUCTURE, 'Storage bucket', OK, bucketName);

  return result('bucket', INFRASTRUCTURE, 'Storage bucket', MISSING, 'no default bucket', {
    // Permanently located, like the database above.
    hint: `npm run localess:setup -- --project ${projectId}`,
  });
}

export function checkBucketCors(bucketName, cors) {
  if (!bucketName) {
    return result('cors', INFRASTRUCTURE, 'Storage CORS', UNKNOWN, 'no bucket to check');
  }
  if (cors === null || cors === undefined) {
    return result('cors', INFRASTRUCTURE, 'Storage CORS', UNKNOWN, `could not read the CORS configuration of ${bucketName}`);
  }
  if (!needsBucketCors(cors)) {
    return result('cors', INFRASTRUCTURE, 'Storage CORS', OK, `${cors.length} rule${cors.length === 1 ? '' : 's'}`);
  }
  return result('cors', INFRASTRUCTURE, 'Storage CORS', MISSING, `no rules on ${bucketName}; asset downloads will fail`, {
    fix: FIX_CORS,
  });
}

export function checkWebApp(apps, projectId) {
  if (apps === null || apps === undefined) {
    return result('webApp', INFRASTRUCTURE, 'Web app', UNKNOWN, 'could not list the web apps');
  }
  if (apps.length > 0) return result('webApp', INFRASTRUCTURE, 'Web app', OK, apps[0].appId);

  return result('webApp', INFRASTRUCTURE, 'Web app', MISSING, 'no web app; there is no SDK config to build against', {
    hint: `npm run localess:setup -- --project ${projectId}`,
  });
}

export function checkHostingSite(sites, projectId) {
  if (sites === null || sites === undefined) {
    return result('hosting', INFRASTRUCTURE, 'Hosting site', UNKNOWN, 'could not list the hosting sites');
  }
  if (sites.length > 0) {
    return result('hosting', INFRASTRUCTURE, 'Hosting site', OK, sites[0].name?.split('/').pop() ?? `${sites.length} site(s)`);
  }
  return result('hosting', INFRASTRUCTURE, 'Hosting site', MISSING, 'no hosting site', {
    hint: `npm run localess:setup -- --project ${projectId}`,
  });
}

/**
 * The three project labels.
 *
 * `localess-managed` is the one that matters operationally - deploy and sync refuse a
 * project without it - so its absence is reported rather than acted on. This is the one
 * check whose subject the sibling commands treat as a precondition, which is exactly why
 * `check` must not gate itself on it.
 */
export function checkLabels(labels) {
  if (labels === null || labels === undefined) {
    return result('labels', INFRASTRUCTURE, 'Project labels', UNKNOWN, 'could not read the project labels');
  }

  const absent = [];
  if (!hasMarker(labels)) absent.push(MANAGED_LABEL);
  if (!markerVersion(labels)) absent.push(VERSION_LABEL);
  if (!markerRegion(labels)) absent.push(REGION_LABEL);

  if (absent.length === 0) {
    return result(
      'labels',
      INFRASTRUCTURE,
      'Project labels',
      OK,
      `Localess ${markerVersion(labels)} in ${markerRegion(labels)}`,
    );
  }
  return result('labels', INFRASTRUCTURE, 'Project labels', MISSING, `absent: ${absent.join(', ')}`, { fix: FIX_LABELS });
}

/**
 * Whether every copy of the region agrees with the live Firestore location.
 *
 * They drift independently - the label is written by setup, `.env.<id>` by sync,
 * `functions/.env.<id>` by generate - and a disagreement is silent until Functions end up
 * pointed at a region their own data is not in. The live location wins because it is the
 * only one that cannot be changed.
 */
export function checkRegionAgreement({ live, label, env, functionsEnv }) {
  if (!live) {
    return result('region', INFRASTRUCTURE, 'Region agreement', UNKNOWN, 'no live Firestore location to compare against');
  }

  const disagree = Object.entries({ [REGION_LABEL]: label, '.env': env, 'functions/.env': functionsEnv })
    .filter(([, value]) => value && value !== live)
    .map(([source, value]) => `${source}=${value}`);

  if (disagree.length === 0) {
    return result('region', INFRASTRUCTURE, 'Region agreement', OK, live);
  }
  return result('region', INFRASTRUCTURE, 'Region agreement', MISSING, `Firestore is in ${live} but ${disagree.join(', ')}`, {
    fix: FIX_LOCAL_FILES,
  });
}

/** The generated files a build and a deploy read. All gitignored, all regenerable. */
export function checkLocalFiles(absentPaths, total) {
  if (absentPaths.length === 0) {
    return result('localFiles', INFRASTRUCTURE, 'Local files', OK, `${total}/${total} present`);
  }
  return result('localFiles', INFRASTRUCTURE, 'Local files', MISSING, `absent: ${absentPaths.join(', ')}`, {
    fix: FIX_LOCAL_FILES,
  });
}

/* -------------------------------------------------------------------------- */
/* Deployment                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The function groups `functions/src/index.ts` exports.
 *
 * Read from source rather than hardcoded so the list cannot go stale. Most exports are an
 * object of related functions (`export const asset = { ondelete }`), which Firebase
 * flattens into `asset-ondelete` with the entry point `asset.ondelete` - so the export
 * name is the group, and the deployed entry point names its group in turn.
 */
export function parseFunctionExports(source) {
  const names = [];
  for (const match of source.matchAll(/^export\s*\{\s*(\w+)(?:\s+as\s+(\w+))?\s*\}/gm)) {
    names.push(match[2] ?? match[1]);
  }
  return names;
}

/**
 * Whether every exported group has at least one deployed function.
 *
 * Group level, not function level: a group's members are only knowable by compiling
 * `functions/`, and a check that needed a build would not be run. This catches a whole
 * group vanishing, which is what a partially failed first deploy actually does - it does
 * not catch one missing sibling inside a group.
 */
export function checkFunctions(deployed, expected, projectId) {
  if (deployed === null || deployed === undefined) {
    return result('functions', DEPLOYMENT, 'Functions', UNKNOWN, 'could not list the deployed functions');
  }
  if (deployed.length === 0) {
    return result('functions', DEPLOYMENT, 'Functions', MISSING, 'nothing is deployed', {
      hint: `npm run localess:deploy -- --project ${projectId}`,
    });
  }

  const groups = new Set(deployed.map(fn => (fn.entryPoint ?? fn.id ?? '').split('.')[0]));
  const absent = expected.filter(name => !groups.has(name));

  if (absent.length === 0) {
    return result('functions', DEPLOYMENT, 'Functions', OK, `${deployed.length} across ${expected.length} groups`);
  }
  return result('functions', DEPLOYMENT, 'Functions', MISSING, `${absent.length} group(s) absent: ${absent.join(', ')}`, {
    hint: `npm run localess:deploy -- --project ${projectId} --only functions`,
  });
}

/**
 * The functions a browser has to be able to reach without credentials.
 *
 * Callables and the `publicv1` REST entry point, and nothing else. Event and blocking
 * triggers are invoked by Google's own service agents, so making them public would widen
 * access for no reason.
 */
export function publiclyInvocable(deployed) {
  return (deployed ?? []).filter(fn => fn.callableTrigger || fn.httpsTrigger);
}

/**
 * Whether every publicly invocable function actually grants `allUsers` the invoker role.
 *
 * firebase-tools binds this in the function *create* path only. A function created during
 * a deploy that failed partway is updated rather than created on every run afterwards -
 * reported as "skipped, no changes detected" - so it never acquires the binding, and every
 * unauthenticated call to it returns 403 while the deploy keeps reporting success.
 */
export function checkInvokers(invokers, projectId) {
  if (invokers === null || invokers === undefined) {
    return result('invokers', DEPLOYMENT, 'Invoker bindings', UNKNOWN, 'could not read the Cloud Run IAM policies');
  }
  if (invokers.length === 0) {
    return result('invokers', DEPLOYMENT, 'Invoker bindings', UNKNOWN, 'no callable or https functions deployed');
  }

  const unreadable = invokers.filter(entry => entry.hasInvoker === null);
  if (unreadable.length === invokers.length) {
    return result('invokers', DEPLOYMENT, 'Invoker bindings', UNKNOWN, 'could not read the Cloud Run IAM policies');
  }

  const closed = invokers.filter(entry => entry.hasInvoker === false);
  if (closed.length === 0) {
    return result('invokers', DEPLOYMENT, 'Invoker bindings', OK, `${invokers.length} reachable from the browser`);
  }
  return result(
    'invokers',
    DEPLOYMENT,
    'Invoker bindings',
    MISSING,
    `${closed.length} of ${invokers.length} reject unauthenticated calls: ${closed.map(entry => entry.id).join(', ')}`,
    { fix: FIX_INVOKERS },
  );
}

/** Email/password is the provider Localess provisions; the rest are a console decision. */
export function checkEmailProvider(identityConfig, projectId) {
  if (identityConfig === null || identityConfig === undefined) {
    return result('emailProvider', DEPLOYMENT, 'Email sign-in', UNKNOWN, 'could not read the Identity Platform config');
  }
  if (identityConfig.signIn?.email?.enabled) {
    return result('emailProvider', DEPLOYMENT, 'Email sign-in', OK, 'email/password enabled');
  }
  return result('emailProvider', DEPLOYMENT, 'Email sign-in', MISSING, 'email/password is disabled; nobody can sign in', {
    // The `auth` block in firebase.json is the source of truth, so a deploy is the fix.
    hint: `npm run localess:deploy -- --project ${projectId} --only auth`,
  });
}

/* -------------------------------------------------------------------------- */
/* Application                                                                */
/* -------------------------------------------------------------------------- */

/** A user carries the admin role when its custom claims say `role: admin`. */
export function isAdminUser(user) {
  try {
    return JSON.parse(user?.customAttributes ?? '{}').role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Whether anyone can administer this installation.
 *
 * Identity Platform has no server-side filter on custom claims, so this scans a page of
 * accounts. A project with more accounts than the page holds and no admin among them
 * reports `unknown` rather than `missing` - the answer is genuinely not known, and a large
 * user base is the case where a false alarm would be least believable.
 */
export function checkAdminUser(accounts, limit, projectId) {
  if (accounts === null || accounts === undefined) {
    return result('adminUser', APPLICATION, 'Admin user', UNKNOWN, 'could not query the accounts');
  }

  const admins = accounts.users.filter(isAdminUser);
  if (admins.length > 0) {
    const names = admins.map(user => user.email).filter(Boolean);
    return result('adminUser', APPLICATION, 'Admin user', OK, names.length > 0 ? names.join(', ') : `${admins.length} admin(s)`);
  }

  if (accounts.recordsCount > accounts.users.length) {
    return result(
      'adminUser',
      APPLICATION,
      'Admin user',
      UNKNOWN,
      `no admin among the first ${accounts.users.length} of ${accounts.recordsCount} accounts`,
    );
  }

  const detail = accounts.recordsCount === 0 ? 'no accounts exist yet' : `${accounts.recordsCount} account(s), none with role: admin`;
  return result('adminUser', APPLICATION, 'Admin user', MISSING, detail, {
    // `--fix` prompts for credentials and calls the same `setup` callable the web wizard
    // does, rather than reimplementing it: that callable also seeds the first space, and
    // two implementations of "what a first admin needs" would drift. Closing this promptly
    // matters - `setup` cannot require authentication, so until an admin exists anyone who
    // knows the project id can claim the account.
    fix: FIX_ADMIN_USER,
  });
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

/** Runs every check against already-fetched facts. Pure, so the whole report is testable. */
export function buildReport(facts) {
  const { projectId } = facts;
  return [
    checkBilling(facts.billingEnabled, projectId),
    checkApis(facts.enabledApis),
    checkFirestore(facts.databases, projectId),
    checkBucket(facts.bucketName, projectId),
    checkBucketCors(facts.bucketName, facts.bucketCors),
    checkWebApp(facts.webApps, projectId),
    checkHostingSite(facts.hostingSites, projectId),
    checkLabels(facts.labels),
    checkRegionAgreement(facts.regions),
    checkLocalFiles(facts.absentLocalFiles, facts.localFileCount),
    checkFunctions(facts.deployedFunctions, facts.expectedGroups, projectId),
    checkInvokers(facts.invokers, projectId),
    checkEmailProvider(facts.identityConfig, projectId),
    checkAdminUser(facts.accounts, facts.accountLimit, projectId),
  ];
}

export function summarize(results) {
  const missing = results.filter(entry => entry.status === MISSING);
  // Deduplicated: two findings can share one repair - a stale region label and absent local
  // files are both cured by one sync. Ordered by FIX_ORDER, which repairs depend on.
  const fixable = [...new Set(missing.map(entry => entry.fix).filter(Boolean))].sort(
    (a, b) => FIX_ORDER.indexOf(a) - FIX_ORDER.indexOf(b),
  );

  return {
    ok: results.filter(entry => entry.status === OK).length,
    missing,
    unknown: results.filter(entry => entry.status === UNKNOWN),
    fixable,
  };
}

/**
 * The process exit code.
 *
 * `unknown` does not fail. A check that could not read something says so in yellow, but
 * turning a gap in the *checker's* permissions into a red CI build would punish the wrong
 * thing - only a fact we actually established is worth failing on.
 */
export function exitCodeFor(results) {
  return results.some(entry => entry.status === MISSING) ? 1 : 0;
}
