import { test } from 'node:test';
import assert from 'node:assert/strict';

import { REQUIRED_APIS } from './apis.mjs';
import { BUCKET_CORS } from './bucket-cors.mjs';
import { MANAGED_LABEL, REGION_LABEL, VERSION_LABEL } from './markers.mjs';
import {
  APPLICATION,
  DEPLOYMENT,
  FIX_ADMIN_USER,
  FIX_APIS,
  FIX_CORS,
  FIX_INVOKERS,
  FIX_LABELS,
  FIX_LOCAL_FILES,
  FIX_ORDER,
  INFRASTRUCTURE,
  MISSING,
  OK,
  UNKNOWN,
  buildReport,
  checkAdminUser,
  checkApis,
  checkBilling,
  checkBucket,
  checkBucketCors,
  checkEmailProvider,
  checkFirestore,
  checkFunctions,
  checkHostingSite,
  checkInvokers,
  checkLabels,
  checkLocalFiles,
  checkRegionAgreement,
  checkWebApp,
  exitCodeFor,
  isAdminUser,
  parseFunctionExports,
  publiclyInvocable,
  summarize,
} from './checks.mjs';

const PROJECT = 'my-localess';

/* -------------------------------------------------------------------------- */
/* Billing                                                                    */
/* -------------------------------------------------------------------------- */

test('checkBilling is ok when Blaze is active', () => {
  assert.equal(checkBilling(true, PROJECT).status, OK);
});

test('checkBilling reports a missing billing account without offering to fix it', () => {
  const entry = checkBilling(false, PROJECT);
  assert.equal(entry.status, MISSING);
  // Linking billing spends money, so it is never automated - setup refuses to guess too.
  assert.equal(entry.fix, null);
  assert.match(entry.hint, /console\.cloud\.google\.com\/billing/);
});

test('checkBilling reports unknown when billing could not be read', () => {
  assert.equal(checkBilling(null, PROJECT).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* APIs                                                                       */
/* -------------------------------------------------------------------------- */

test('checkApis is ok when every required API is enabled', () => {
  const entry = checkApis(new Set(REQUIRED_APIS));
  assert.equal(entry.status, OK);
  assert.match(entry.detail, new RegExp(`${REQUIRED_APIS.length}/${REQUIRED_APIS.length}`));
});

test('checkApis names the disabled APIs and offers the automatic fix', () => {
  const enabled = new Set(REQUIRED_APIS.filter(api => api !== 'translate.googleapis.com'));
  const entry = checkApis(enabled);
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_APIS);
  assert.match(entry.detail, /translate\.googleapis\.com/);
});

test('checkApis reports unknown rather than "all 15 missing" when the list could not be read', () => {
  // missingApis(null) returns every API, which is the right answer for `ensureRequiredApis`
  // - enabling an already-enabled API is free. It is the wrong answer for a report.
  assert.equal(checkApis(null).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Firestore, bucket, CORS                                                    */
/* -------------------------------------------------------------------------- */

test('checkFirestore reports the location of the default database', () => {
  const entry = checkFirestore([{ name: 'projects/p/databases/(default)', locationId: 'europe-west6' }], PROJECT);
  assert.equal(entry.status, OK);
  assert.match(entry.detail, /europe-west6/);
});

test('checkFirestore ignores databases that are not (default)', () => {
  assert.equal(checkFirestore([{ name: 'projects/p/databases/analytics', locationId: 'us-central1' }], PROJECT).status, MISSING);
});

test('checkFirestore never offers to create the database', () => {
  // Its location is immutable, so creating it is setup's decision behind setup's prompt.
  const entry = checkFirestore([], PROJECT);
  assert.equal(entry.fix, null);
  assert.match(entry.hint, /localess:setup/);
});

test('checkBucket distinguishes "no bucket" from "could not read"', () => {
  assert.equal(checkBucket(null, PROJECT).status, MISSING);
  assert.equal(checkBucket(undefined, PROJECT).status, UNKNOWN);
});

test('checkBucketCors offers the automatic fix for an empty configuration', () => {
  const entry = checkBucketCors('b.appspot.com', []);
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_CORS);
});

test('checkBucketCors leaves an existing configuration alone', () => {
  assert.equal(checkBucketCors('b.appspot.com', [...BUCKET_CORS]).status, OK);
});

test('checkBucketCors reports unknown when the rules could not be read', () => {
  // Never MISSING: --fix must not overwrite rules we failed to read.
  assert.equal(checkBucketCors('b.appspot.com', null).status, UNKNOWN);
});

test('checkBucketCors reports unknown when there is no bucket to check', () => {
  assert.equal(checkBucketCors(null, []).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Web app and hosting                                                        */
/* -------------------------------------------------------------------------- */

test('checkWebApp reports the app id', () => {
  assert.equal(checkWebApp([{ appId: '1:1:web:abc' }], PROJECT).detail, '1:1:web:abc');
});

test('checkWebApp reports a project with no web app as missing', () => {
  assert.equal(checkWebApp([], PROJECT).status, MISSING);
});

test('checkHostingSite reports the site id', () => {
  assert.equal(checkHostingSite([{ name: 'projects/p/sites/my-localess' }], PROJECT).detail, 'my-localess');
});

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

test('checkLabels is ok when all three markers are present', () => {
  const entry = checkLabels({ [MANAGED_LABEL]: 'true', [VERSION_LABEL]: '4-0-0', [REGION_LABEL]: 'europe-west6' });
  assert.equal(entry.status, OK);
  assert.match(entry.detail, /4\.0\.0/);
});

test('checkLabels names each absent marker and offers the automatic fix', () => {
  const entry = checkLabels({});
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_LABELS);
  for (const label of [MANAGED_LABEL, VERSION_LABEL, REGION_LABEL]) assert.match(entry.detail, new RegExp(label));
});

test('checkLabels reports a version-only marker as partially absent', () => {
  const entry = checkLabels({ [MANAGED_LABEL]: 'true', [VERSION_LABEL]: '4-0-0' });
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, new RegExp(REGION_LABEL));
});

test('checkLabels reports unknown when the labels could not be read', () => {
  // An unreadable label is not an absent label - this is the gap `assertManaged` cannot see.
  assert.equal(checkLabels(null).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Region agreement                                                           */
/* -------------------------------------------------------------------------- */

test('checkRegionAgreement is ok when every copy matches the live location', () => {
  const entry = checkRegionAgreement({ live: 'europe-west6', label: 'europe-west6', env: 'europe-west6', functionsEnv: 'europe-west6' });
  assert.equal(entry.status, OK);
});

test('checkRegionAgreement names every copy that disagrees', () => {
  const entry = checkRegionAgreement({ live: 'europe-west6', label: 'us-central1', env: 'europe-west6', functionsEnv: 'us-central1' });
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_LOCAL_FILES);
  assert.match(entry.detail, new RegExp(`${REGION_LABEL}=us-central1`));
  assert.match(entry.detail, /functions\/\.env=us-central1/);
});

test('checkRegionAgreement ignores copies that are simply absent', () => {
  // An absent region is "not written yet", which checkLocalFiles reports. Only a *different*
  // value is a disagreement.
  assert.equal(checkRegionAgreement({ live: 'europe-west6', label: null, env: null, functionsEnv: null }).status, OK);
});

test('checkRegionAgreement reports unknown without a live location to compare against', () => {
  assert.equal(checkRegionAgreement({ live: null, label: 'europe-west6' }).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Local files                                                                */
/* -------------------------------------------------------------------------- */

test('checkLocalFiles counts against the real total rather than a hardcoded one', () => {
  assert.equal(checkLocalFiles([], 5).detail, '5/5 present');
});

test('checkLocalFiles names the absent files and offers the automatic fix', () => {
  const entry = checkLocalFiles(['.env.my-localess'], 5);
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_LOCAL_FILES);
});

/* -------------------------------------------------------------------------- */
/* Functions                                                                  */
/* -------------------------------------------------------------------------- */

test('parseFunctionExports reads the grouped exports of functions/src/index.ts', () => {
  const source = ["export { asset } from './assets';", "export { setup } from './setup';"].join('\n');
  assert.deepEqual(parseFunctionExports(source), ['asset', 'setup']);
});

test('parseFunctionExports uses the alias, which is the name Firebase deploys', () => {
  // `export { v1 as publicv1 }` deploys as `publicv1`; the local name is invisible remotely.
  assert.deepEqual(parseFunctionExports("export { v1 as publicv1 } from './v1';"), ['publicv1']);
});

test('parseFunctionExports ignores imports and value exports', () => {
  const source = ["import { setGlobalOptions } from 'firebase-functions/v2';", 'export const region = 1;'].join('\n');
  assert.deepEqual(parseFunctionExports(source), []);
});

test('checkFunctions maps a deployed entry point back to its export group', () => {
  const deployed = [{ id: 'asset-ondelete', entryPoint: 'asset.ondelete' }, { id: 'setup', entryPoint: 'setup' }];
  assert.equal(checkFunctions(deployed, ['asset', 'setup'], PROJECT).status, OK);
});

test('checkFunctions reports a group with nothing deployed', () => {
  const deployed = [{ id: 'asset-ondelete', entryPoint: 'asset.ondelete' }];
  const entry = checkFunctions(deployed, ['asset', 'publicv1'], PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, /publicv1/);
  assert.match(entry.hint, /--only functions/);
});

test('checkFunctions treats an empty deployment as not deployed at all', () => {
  const entry = checkFunctions([], ['asset'], PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, /nothing is deployed/);
});

test('checkFunctions never offers an automatic fix - only a deploy creates functions', () => {
  assert.equal(checkFunctions([], ['asset'], PROJECT).fix, null);
});

/* -------------------------------------------------------------------------- */
/* Invoker bindings                                                           */
/* -------------------------------------------------------------------------- */

test('publiclyInvocable selects callables and https functions only', () => {
  const deployed = [
    { id: 'setup', callableTrigger: {} },
    { id: 'publicv1', httpsTrigger: {} },
    { id: 'asset-ondelete', eventTrigger: {} },
    { id: 'user-beforecreated', blockingTrigger: {} },
  ];
  assert.deepEqual(publiclyInvocable(deployed).map(fn => fn.id), ['setup', 'publicv1']);
});

test('publiclyInvocable excludes blocking triggers, which Identity Platform invokes itself', () => {
  assert.deepEqual(publiclyInvocable([{ id: 'user-beforecreated', blockingTrigger: {} }]), []);
});

test('checkInvokers is ok when every public function grants allUsers', () => {
  const entry = checkInvokers([{ id: 'setup', hasInvoker: true }], PROJECT);
  assert.equal(entry.status, OK);
});

test('checkInvokers names the functions that reject unauthenticated calls', () => {
  const entry = checkInvokers([{ id: 'setup', hasInvoker: false }, { id: 'publicv1', hasInvoker: true }], PROJECT);
  assert.equal(entry.status, MISSING);
  assert.equal(entry.fix, FIX_INVOKERS);
  assert.match(entry.detail, /1 of 2/);
  assert.match(entry.detail, /setup/);
});

test('checkInvokers reports unknown when no policy could be read', () => {
  assert.equal(checkInvokers([{ id: 'setup', hasInvoker: null }], PROJECT).status, UNKNOWN);
});

test('checkInvokers still reports the readable ones when only some policies failed', () => {
  const entry = checkInvokers([{ id: 'setup', hasInvoker: null }, { id: 'translate', hasInvoker: false }], PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, /translate/);
});

test('checkInvokers reports unknown rather than ok when nothing is deployed', () => {
  // "0 of 0 are closed" is true and useless; there is simply nothing to judge.
  assert.equal(checkInvokers([], PROJECT).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Email sign-in                                                              */
/* -------------------------------------------------------------------------- */

test('checkEmailProvider is ok when email/password is enabled', () => {
  assert.equal(checkEmailProvider({ signIn: { email: { enabled: true } } }, PROJECT).status, OK);
});

test('checkEmailProvider reports a disabled provider and points at a deploy', () => {
  const entry = checkEmailProvider({ signIn: { email: { enabled: false } } }, PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.hint, /--only auth/);
});

test('checkEmailProvider treats an uninitialised Identity Platform as missing, not unknown', () => {
  // getIdentityConfig maps a 404 to {} deliberately: "never provisioned" is a real finding.
  assert.equal(checkEmailProvider({}, PROJECT).status, MISSING);
});

test('checkEmailProvider reports unknown when the config could not be read', () => {
  assert.equal(checkEmailProvider(null, PROJECT).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Admin user                                                                 */
/* -------------------------------------------------------------------------- */

test('isAdminUser reads the role out of the custom claims', () => {
  assert.equal(isAdminUser({ customAttributes: '{"role":"admin"}' }), true);
  assert.equal(isAdminUser({ customAttributes: '{"role":"editor"}' }), false);
});

test('isAdminUser tolerates absent or malformed claims', () => {
  assert.equal(isAdminUser({}), false);
  assert.equal(isAdminUser({ customAttributes: 'not json' }), false);
  assert.equal(isAdminUser(undefined), false);
});

test('checkAdminUser names the admins it found', () => {
  const entry = checkAdminUser(
    { recordsCount: 2, users: [{ email: 'a@example.com', customAttributes: '{"role":"admin"}' }, { email: 'b@example.com' }] },
    500,
    PROJECT,
  );
  assert.equal(entry.status, OK);
  assert.equal(entry.detail, 'a@example.com');
});

test('checkAdminUser reports an empty project as missing', () => {
  const entry = checkAdminUser({ recordsCount: 0, users: [] }, 500, PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, /no accounts exist yet/);
});

test('checkAdminUser reports users without the admin claim as missing', () => {
  const entry = checkAdminUser({ recordsCount: 1, users: [{ email: 'a@example.com' }] }, 500, PROJECT);
  assert.equal(entry.status, MISSING);
  assert.match(entry.detail, /none with role: admin/);
});

test('checkAdminUser reports unknown when it could not see every account', () => {
  // Identity Platform cannot filter on custom claims, so beyond one page the answer is
  // genuinely not known - and a big user base is where a false alarm is least credible.
  const entry = checkAdminUser({ recordsCount: 900, users: [{ email: 'a@example.com' }] }, 500, PROJECT);
  assert.equal(entry.status, UNKNOWN);
  assert.match(entry.detail, /900/);
});

test('checkAdminUser offers the repair rather than sending the operator to the web wizard', () => {
  // The window between a deploy and a completed wizard is the window in which anyone who
  // knows the project id can claim the admin account, so --fix closes it in the same run.
  const entry = checkAdminUser({ recordsCount: 0, users: [] }, 500, PROJECT);
  assert.equal(entry.fix, FIX_ADMIN_USER);
  assert.equal(entry.hint, null);
});

test('checkAdminUser reports unknown when the accounts could not be queried', () => {
  assert.equal(checkAdminUser(null, 500, PROJECT).status, UNKNOWN);
});

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

const healthyFacts = {
  projectId: PROJECT,
  billingEnabled: true,
  enabledApis: new Set(REQUIRED_APIS),
  databases: [{ name: 'projects/p/databases/(default)', locationId: 'europe-west6' }],
  bucketName: 'b.appspot.com',
  bucketCors: [...BUCKET_CORS],
  webApps: [{ appId: '1:1:web:abc' }],
  hostingSites: [{ name: 'projects/p/sites/my-localess' }],
  labels: { [MANAGED_LABEL]: 'true', [VERSION_LABEL]: '4-0-0', [REGION_LABEL]: 'europe-west6' },
  deployedFunctions: [{ id: 'setup', entryPoint: 'setup', callableTrigger: {} }],
  expectedGroups: ['setup'],
  invokers: [{ id: 'setup', hasInvoker: true }],
  identityConfig: { signIn: { email: { enabled: true } } },
  accounts: { recordsCount: 1, users: [{ email: 'a@example.com', customAttributes: '{"role":"admin"}' }] },
  accountLimit: 500,
  absentLocalFiles: [],
  localFileCount: 5,
  regions: { live: 'europe-west6', label: 'europe-west6', env: 'europe-west6', functionsEnv: 'europe-west6' },
};

test('buildReport returns every check, grouped in install order', () => {
  const results = buildReport(healthyFacts);
  assert.equal(results.length, 14);
  const groups = [...new Set(results.map(entry => entry.group))];
  assert.deepEqual(groups, [INFRASTRUCTURE, DEPLOYMENT, APPLICATION]);
});

test('buildReport gives every check a unique id', () => {
  const ids = buildReport(healthyFacts).map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a healthy project reports no problems and exits 0', () => {
  const results = buildReport(healthyFacts);
  assert.deepEqual(summarize(results).missing, []);
  assert.equal(exitCodeFor(results), 0);
});

test('buildReport survives a project where nothing could be read', () => {
  const blind = { projectId: PROJECT, absentLocalFiles: [], localFileCount: 5, expectedGroups: [], regions: {} };
  const results = buildReport(blind);
  assert.equal(results.length, 14);
  // Nothing was established, so nothing is reported as broken.
  assert.equal(exitCodeFor(results), 0);
});

test('summarize deduplicates repairs that a single action covers', () => {
  const results = [
    checkRegionAgreement({ live: 'europe-west6', label: 'us-central1' }),
    checkLocalFiles(['.env.my-localess'], 5),
  ];
  // One sync cures both.
  assert.deepEqual(summarize(results).fixable, [FIX_LOCAL_FILES]);
});

test('exitCodeFor fails on an established problem', () => {
  assert.equal(exitCodeFor(buildReport({ ...healthyFacts, accounts: { recordsCount: 0, users: [] } })), 1);
});

test('exitCodeFor does not fail on an unreadable check', () => {
  // A gap in the checker's own permissions must not turn a CI build red.
  assert.equal(exitCodeFor(buildReport({ ...healthyFacts, accounts: null })), 0);
});

test('summarize orders every repair by FIX_ORDER regardless of check order', () => {
  const results = [
    checkAdminUser({ recordsCount: 0, users: [] }, 500, PROJECT),
    checkLocalFiles(['.env.my-localess'], 5),
    checkApis(new Set()),
  ];
  const { fixable } = summarize(results);
  assert.deepEqual(
    fixable,
    [...fixable].sort((a, b) => FIX_ORDER.indexOf(a) - FIX_ORDER.indexOf(b)),
  );
  assert.equal(fixable[0], FIX_APIS);
  assert.equal(fixable.at(-1), FIX_ADMIN_USER);
});

test('FIX_ORDER covers every repair a check can ask for', () => {
  // A repair missing from FIX_ORDER would sort to index -1 and silently run first.
  const everyFix = new Set(
    [
      checkApis(new Set()),
      checkBucketCors('b', []),
      checkLabels({}),
      checkLocalFiles(['x'], 5),
      checkInvokers([{ id: 'setup', hasInvoker: false }], PROJECT),
      checkAdminUser({ recordsCount: 0, users: [] }, 500, PROJECT),
    ].map(entry => entry.fix),
  );
  for (const fix of everyFix) assert.ok(FIX_ORDER.includes(fix), `${fix} is absent from FIX_ORDER`);
  assert.equal(everyFix.size, FIX_ORDER.length);
});
