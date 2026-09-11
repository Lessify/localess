/**
 * Reports what a Localess installation is still missing, and optionally repairs it.
 *
 * Usage:
 *   npm run localess:check -- [--project <id>] [--fix] [--admin-email <email>] [--admin-name <name>]
 *
 * Unlike deploy and sync this command does NOT gate on the `localess-managed` label: a
 * missing label is one of the things it exists to report, so refusing to run without one
 * would hide the very finding you came for.
 *
 * Read-only by default. `--fix` applies only the repairs that are free and reversible - see
 * the FIX_* constants in `checks.mjs`. Anything that picks a permanent location, spends
 * money or pushes code is reported with the command that does it instead.
 *
 * Creating the first admin is the one repair that is not idempotent, and the one that
 * prompts. It is in `--fix` because the alternative is worse: the `setup` callable cannot
 * require authentication, so every minute a deployed project has no admin is a minute
 * anyone who knows the project id can claim the account.
 */
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cli } from '../firebase-cli.mjs';
import { firebaseTools } from '../firebase-tools.mjs';
import { DEFAULT_REGION, configPath, parseEnvFile } from '../config.mjs';
import {
  addRunInvoker,
  authenticate,
  getBucketCors,
  getDefaultBucket,
  getIdentityConfig,
  getRunIamPolicy,
  isBillingEnabled,
  listEnabledApis,
  mergeProjectLabels,
  queryIdentityUsers,
  readProjectLabels,
} from '../firebase-gaps.mjs';
import { ensureRequiredApis } from '../apis.mjs';
import { ensureBucketCors } from '../bucket-cors.mjs';
import { PASSWORD_ENV, ensureFirstAdmin } from '../admin-user.mjs';
import { buildMarkerLabels, markerRegion } from '../markers.mjs';
import {
  APPLICATION,
  DEPLOYMENT,
  FIX_ADMIN_USER,
  FIX_APIS,
  FIX_CORS,
  FIX_INVOKERS,
  FIX_LABELS,
  FIX_LOCAL_FILES,
  INFRASTRUCTURE,
  MISSING,
  OK,
  buildReport,
  exitCodeFor,
  parseFunctionExports,
  publiclyInvocable,
  summarize,
} from '../checks.mjs';
import { ROOT, createLogger, rel } from '../log.mjs';
import { UsageError } from '../usage.mjs';
import { buildSdkConfigPath, liveRegion, resolveProjectSelection, sdkConfigPath, syncLocalFiles } from './sync.mjs';

export const USAGE =
  'Usage: npm run localess:check -- [--project <id>] [--fix] [--admin-email <email>] [--admin-name <name>]\n' +
  `  The admin password is read from ${PASSWORD_ENV}, never from a flag. Omit both and --fix asks.`;

export const FAILURE_HINT = 'Nothing was changed - this command only reads unless --fix is given.';

/** Recorded in the project label when `--fix` writes the markers. */
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

/** Accounts scanned when looking for an admin. Beyond this the answer is "unknown". */
const ACCOUNT_SCAN_LIMIT = 500;

const log = createLogger();

/** Never throws: a check that cannot read a fact must report `unknown`, not crash. */
const attempt = async (promise, fallback = null) => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

/** The generated files a build and a deploy read. All gitignored, all regenerable. */
function localFiles(projectId) {
  return [
    configPath(ROOT, projectId),
    resolve(ROOT, 'functions', `.env.${projectId}`),
    resolve(ROOT, `firebase.${projectId}.json`),
    sdkConfigPath(projectId),
    buildSdkConfigPath(),
  ];
}

function readEnvValue(path, key) {
  try {
    return parseEnvFile(readFileSync(path, 'utf8'))[key] ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads the IAM policy of every publicly invocable function.
 *
 * One request per function, in parallel. That is the expensive part of this command - a
 * full install is about eighteen - and there is no bulk alternative: Cloud Run has no
 * endpoint that returns policies for a whole location.
 */
async function readInvokers(projectId, deployed) {
  const services = publiclyInvocable(deployed);
  return Promise.all(
    services.map(async fn => {
      const policy = await getRunIamPolicy(projectId, fn.region, fn.runServiceId ?? fn.id);
      if (policy === null) return { id: fn.id, region: fn.region, service: fn.runServiceId ?? fn.id, hasInvoker: null };

      const hasInvoker = (policy.bindings ?? []).some(
        binding => binding.role === 'roles/run.invoker' && (binding.members ?? []).includes('allUsers'),
      );
      return { id: fn.id, region: fn.region, service: fn.runServiceId ?? fn.id, hasInvoker };
    }),
  );
}

/**
 * Fetches every fact the report needs.
 *
 * Issued in one parallel wave rather than sequentially: they are independent reads, and a
 * command whose whole job is to answer a question quickly should not take fourteen round
 * trips in series. The two that depend on an earlier answer - the bucket's CORS rules, the
 * invoker policies - are chained after the wave.
 */
async function gather(projectId) {
  log.step(`Inspecting ${projectId}`);

  const [billingEnabled, enabledApis, databases, bucketName, webApps, hostingSites, labels, deployedFunctions, identityConfig, accounts] =
    await Promise.all([
      attempt(isBillingEnabled(projectId)),
      listEnabledApis(projectId),
      attempt(cli.listFirestoreDatabases(projectId)),
      attempt(getDefaultBucket(projectId), undefined),
      attempt(cli.listWebApps(projectId)),
      attempt(cli.listHostingSites(projectId)),
      readProjectLabels(projectId),
      attempt(cli.listFunctions(projectId)),
      getIdentityConfig(projectId),
      queryIdentityUsers(projectId, ACCOUNT_SCAN_LIMIT),
    ]);

  const [bucketCors, invokers, live] = await Promise.all([
    bucketName ? getBucketCors(bucketName) : null,
    deployedFunctions ? readInvokers(projectId, deployedFunctions) : null,
    attempt(liveRegion(projectId)),
  ]);

  const paths = localFiles(projectId);
  const expectedGroups = parseFunctionExports(readFileSync(resolve(ROOT, 'functions', 'src', 'index.ts'), 'utf8'));

  log.done(`${deployedFunctions?.length ?? 0} function(s), ${invokers?.length ?? 0} publicly invocable`);

  return {
    projectId,
    billingEnabled,
    enabledApis,
    databases,
    bucketName,
    bucketCors,
    webApps,
    hostingSites,
    labels,
    deployedFunctions,
    expectedGroups,
    invokers,
    identityConfig,
    accounts,
    accountLimit: ACCOUNT_SCAN_LIMIT,
    absentLocalFiles: paths.filter(path => !existsSync(path)).map(rel),
    localFileCount: paths.length,
    regions: {
      live,
      label: markerRegion(labels),
      env: readEnvValue(configPath(ROOT, projectId), 'LOCALESS_REGION'),
      functionsEnv: readEnvValue(resolve(ROOT, 'functions', `.env.${projectId}`), 'REGION'),
    },
  };
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREY = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const MARKS = {
  [OK]: `${GREEN}+${RESET}`,
  [MISSING]: `${RED}x${RESET}`,
  unknown: `${YELLOW}?${RESET}`,
};

function render(results) {
  const width = Math.max(...results.map(entry => entry.title.length));

  for (const group of [INFRASTRUCTURE, DEPLOYMENT, APPLICATION]) {
    const rows = results.filter(entry => entry.group === group);
    if (rows.length === 0) continue;

    console.log(`\n${BOLD}${group}${RESET}`);
    for (const row of rows) {
      const colour = row.status === OK ? GREY : row.status === MISSING ? RED : YELLOW;
      console.log(`  ${MARKS[row.status]} ${row.title.padEnd(width)}  ${colour}${row.detail}${RESET}`);
    }
  }
}

function renderSummary(results, projectId, fixing) {
  const { missing, unknown, fixable } = summarize(results);

  if (missing.length === 0) {
    console.log(`\n${BOLD}${GREEN}${projectId} is complete.${RESET}`);
    if (unknown.length > 0) {
      console.log(`${YELLOW}${unknown.length} check(s) could not be read - see the ? rows above.${RESET}`);
    }
    console.log('');
    return;
  }

  console.log(
    `\n${BOLD}${RED}${missing.length} problem${missing.length === 1 ? '' : 's'}${RESET}` +
      (fixable.length > 0 ? `, ${fixable.length} fixable automatically.` : '.'),
  );

  if (fixable.length > 0 && !fixing) {
    console.log(`\n  npm run localess:check -- --project ${projectId} --fix\n`);
  }

  const manual = missing.filter(entry => entry.hint);
  if (manual.length > 0) {
    console.log(`\n${BOLD}Not fixable here:${RESET}`);
    for (const entry of manual) console.log(`  - ${entry.title}: ${entry.hint}`);
    console.log('');
  }
}

/**
 * Applies one repair. Every branch is idempotent, so a `--fix` on a healthy project is a
 * no-op and re-running after a partial failure resumes rather than duplicates.
 */
async function applyFix(fix, facts, options) {
  const { projectId, regions } = facts;

  switch (fix) {
    case FIX_APIS:
      await ensureRequiredApis(projectId, log);
      return;

    case FIX_CORS:
      await ensureBucketCors(projectId, log);
      return;

    case FIX_LABELS: {
      log.step('Writing the project labels');
      const region = regions.live ?? regions.label ?? regions.env ?? DEFAULT_REGION;
      await mergeProjectLabels(projectId, buildMarkerLabels(VERSION, region));
      log.done(`localess-managed=true, localess-version=${VERSION}, localess-region=${region}`);
      return;
    }

    case FIX_LOCAL_FILES: {
      log.step('Regenerating the local project files');
      // The live Firestore location wins: it is the only copy of the region that cannot be
      // changed, so it is the only one worth propagating.
      const region = regions.live ?? regions.label ?? regions.env ?? DEFAULT_REGION;
      await syncLocalFiles(projectId, { region, log });
      await mergeProjectLabels(projectId, buildMarkerLabels(VERSION, region));
      log.done(`region ${region} propagated to every copy`);
      return;
    }

    case FIX_INVOKERS: {
      log.step('Opening the callables to unauthenticated callers');
      const closed = (facts.invokers ?? []).filter(entry => entry.hasInvoker === false);
      for (const entry of closed) {
        try {
          await addRunInvoker(projectId, entry.region, entry.service);
          log.done(entry.id);
        } catch (error) {
          log.warn(`${entry.id}: ${error.message}`);
        }
      }
      return;
    }

    case FIX_ADMIN_USER:
      // Talks to the Identity Platform API directly, so this works even on a project whose
      // functions failed to deploy - which is exactly the project this command diagnoses.
      await ensureFirstAdmin(projectId, options.admin, log);
      return;

    default:
      throw new Error(`No repair is registered for '${fix}'.`);
  }
}

async function preflight() {
  log.step('Checking prerequisites');
  log.done(`firebase-tools ${firebaseTools().version}`);

  const accounts = await cli.loggedInAccounts();
  if (accounts.length === 0) {
    throw new Error('Not logged in. Run `npx firebase login` and try again.');
  }

  await authenticate();
  log.done(`authenticated as ${accounts.join(', ')}`);
}

export async function run(argv) {
  let opts;
  try {
    ({ values: opts } = parseArgs({
      args: argv,
      options: {
        project: { type: 'string' },
        fix: { type: 'boolean', default: false },
        // There is deliberately no --admin-password. A password in argv lands in the shell
        // history and is readable from the process list by every other user on the machine.
        'admin-email': { type: 'string' },
        'admin-name': { type: 'string' },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError(error.message);
  }

  const options = {
    admin: {
      email: opts['admin-email'],
      password: process.env[PASSWORD_ENV],
      displayName: opts['admin-name'],
    },
  };

  await preflight();

  const projectId = opts.project ?? (await resolveProjectSelection(log));

  let facts = await gather(projectId);
  let results = buildReport(facts);
  render(results);

  if (opts.fix) {
    const { fixable } = summarize(results);
    if (fixable.length === 0) {
      console.log(`\n${GREY}Nothing here can be repaired automatically.${RESET}`);
    } else {
      for (const fix of fixable) await applyFix(fix, facts, options);

      // Re-read rather than assume: a repair can fail on a permission the operator lacks,
      // and reporting a fix that did not land would be worse than not offering one.
      log.step('Re-checking');
      facts = await gather(projectId);
      results = buildReport(facts);
      render(results);
    }
  }

  renderSummary(results, projectId, opts.fix);
  process.exitCode = exitCodeFor(results);
}
