/**
 * One-command Firebase provisioning for a local Localess checkout.
 *
 * Usage:
 *   npm run localess:setup -- --project <project-id> [options]
 *   npm run localess:setup                              # creates a new project
 *
 * Options:
 *   --project <id>            Adopt an existing project instead of creating one
 *   --display-name <name>     Display name when creating a project
 *   --region <region>         Region for Firestore, Storage and Cloud Functions
 *                             (default: europe-west6). Localess uses gen-2 triggers,
 *                             which must be co-located with the resources they listen
 *                             to, so all three share one region. Omit it and setup asks
 *                             (zone first, then region). On a project that already has a
 *                             Firestore database the existing location wins; passing a
 *                             different --region is an error.
 *   --billing-account <id>    Billing account to link when Blaze is not active
 *   --yes                     Never prompt; fail instead
 *
 * Every step is idempotent: re-run after a failure and completed work is
 * detected and skipped.
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cli } from '../firebase-cli.mjs';
import { DEFAULT_REGION } from '../config.mjs';
import {
  CREATE_NEW,
  askNewProject,
  chooseBillingAccount,
  chooseProject,
  chooseRegion,
  confirmDeploy,
  confirmProvision,
} from '../prompts.mjs';
import { isSupportedRegion } from '../regions.mjs';
import { firebaseTools } from '../firebase-tools.mjs';
import {
  authenticate,
  createDefaultBucket,
  enableApi,
  getDefaultBucket,
  isBillingEnabled,
  linkBillingAccount,
  listOpenBillingAccounts,
  mergeProjectLabels,
  readProjectLabels,
} from '../firebase-gaps.mjs';
import { WEB_APP_NAME, buildMarkerLabels, hasMarker } from '../markers.mjs';
import { annotateProjects } from '../projects.mjs';
import { syncLocalFiles } from './sync.mjs';
import { ROOT, createLogger } from '../log.mjs';
import { UsageError } from '../usage.mjs';


/** Recorded in the project label so the console shows which release provisioned it. */
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

/**
 * APIs Localess needs. `firebase deploy` auto-enables most of the Functions
 * ones, but not all — notably Translate, which is only used at runtime by
 * functions/src/services/translate.service.ts and so is never ensured.
 */
const REQUIRED_APIS = [
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
];

/** Printed after a failure or a cancellation, because every setup step is idempotent. */
export const FAILURE_HINT = 'Re-run when ready - completed steps are detected and skipped.';

export const USAGE =
  'Usage: npm run localess:setup -- [--project <id>] [--display-name <name>] [--region <region>] [--billing-account <id>] [--yes]';

/** Flags that used to exist, with the message to show instead of a bare parse error. */
const REMOVED_FLAGS = {
  '--location': 'Firestore, Storage and Cloud Functions now share one region. Use --region instead.',
  '--storage-location': 'Firestore, Storage and Cloud Functions now share one region. Use --region instead.',
  '--google-support-email':
    'Google sign-in is no longer provisioned by setup. Localess sets up email/password; configure other providers in the Firebase console.',
};

// `log` and `opts` are module-scoped because every helper below closes over them; only the
// assignment moves into `run`.
const log = createLogger();
let opts;

/** Parses argv into `opts`, applying the removed-flag hints and the region rule. */
function parseOptions(argv) {
  for (const [flag, hint] of Object.entries(REMOVED_FLAGS)) {
    if (argv.some(arg => arg === flag || arg.startsWith(`${flag}=`))) {
      throw new UsageError(`${flag} has been removed. ${hint}`);
    }
  }

  try {
    ({ values: opts } = parseArgs({
      args: argv,
      options: {
        project: { type: 'string' },
        'display-name': { type: 'string' },
        region: { type: 'string' },
        'billing-account': { type: 'string' },
        yes: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError(error.message);
  }

  // Rule: a missing parameter is asked for, never guessed. An unsupported --region is
  // treated as missing so the user gets the picker instead of a late failure from the API.
  if (opts.region && !isSupportedRegion(opts.region)) {
    const message = `${opts.region} is not a region where Firestore, Storage and Cloud Functions are all available.`;
    if (opts.yes) throw new UsageError(`${message} Pass a supported --region.`);
    console.warn(`\n\x1b[33m${message}\x1b[0m You will be asked to choose one.`);
    opts.region = undefined;
  }
}

/** Verifies firebase-tools is present, new enough, and authenticated. */
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

/** Adopts `--project`, or creates a new project when none was given. */
/**
 * Confirms before provisioning into a project with no sign of Localess.
 *
 * Setup enables billable APIs and creates a Firestore database whose location can never be
 * changed, so picking the wrong project from a list of similar names is expensive and
 * unrecoverable. A project that already carries the marker skips this.
 */
async function confirmUnrecognisedProject(projectId) {
  if (opts.yes) return;

  const labels = await readProjectLabels(projectId);
  if (hasMarker(labels)) return;

  const apps = await cli.listWebApps(projectId).catch(() => []);
  if (apps?.some(app => app.displayName === WEB_APP_NAME)) return;

  console.log(`\n\x1b[33m${projectId} does not look like a Localess project.\x1b[0m`);
  console.log('    Continuing will make changes that cannot be undone:\n');
  console.log('      - enable 15 Google Cloud APIs (some are billable)');
  console.log('      - create a Firestore database in a location that can never be changed');
  console.log('      - create a default Cloud Storage bucket, also permanently located');
  console.log('      - link a billing account if one is not already active\n');

  if (!(await confirmProvision(projectId))) {
    throw new Error('Cancelled. Nothing was changed.');
  }
}

async function resolveProject() {
  log.step('Resolving Firebase project');

  if (opts.project) {
    // `firebase use` is the validator here: it exits non-zero for a project
    // that does not exist or is not accessible. Scanning `projects:list`
    // instead is unreliable — a freshly created project can take minutes to
    // appear there.
    await cli.useProject(opts.project);
    await confirmUnrecognisedProject(opts.project);
    log.done(`using existing project ${opts.project}`);
    return opts.project;
  }

  if (opts.yes) {
    throw new Error('--yes was given without --project. Pass --project <id> to choose a project non-interactively.');
  }

  const projects = await cli.listProjects();
  log.done(`found ${projects.length} accessible project${projects.length === 1 ? '' : 's'}`);

  const annotations = await annotateProjects(ROOT, projects);

  const selected = await chooseProject(projects, annotations);
  if (selected !== CREATE_NEW) {
    await cli.useProject(selected);
    await confirmUnrecognisedProject(selected);
    log.done(`using existing project ${selected}`);
    return selected;
  }

  const { projectId, displayName } = await askNewProject(opts['display-name'] ?? 'Localess');
  await cli.createProject(projectId, displayName);
  await cli.useProject(projectId);
  log.done(`created project ${projectId}`);
  return projectId;
}

/**
 * Blaze is mandatory: Cloud Functions and Identity Platform both require it.
 * Linking an existing billing account is scriptable; creating one is not, so
 * that case ends in a console link.
 */
async function ensureBilling(projectId) {
  log.step('Checking billing (Blaze plan)');

  if (await isBillingEnabled(projectId)) {
    log.done('billing is enabled');
    return;
  }

  const linkUrl = `https://console.cloud.google.com/billing/linkedaccount?project=${projectId}`;
  const accounts = await listOpenBillingAccounts();
  if (accounts.length === 0) {
    throw new Error(`No billing account available. Create one, then link it here:\n      ${linkUrl}`);
  }

  // Linking billing has cost implications, so an automated run must name the
  // account explicitly rather than have one picked for it.
  const requested = opts['billing-account'];
  let chosen;
  if (requested) {
    chosen = accounts.find(account => account.name === requested || account.name.endsWith(requested));
    if (!chosen) {
      const available = accounts.map(account => account.name).join(', ');
      throw new Error(`Billing account '${requested}' not found. Available: ${available}`);
    }
  } else if (opts.yes) {
    const available = accounts.map(account => account.name).join(', ');
    throw new Error(`--yes was given but no --billing-account. Linking billing has cost implications, so it is never picked for you. Available: ${available}`);
  } else {
    const name = await chooseBillingAccount(accounts);
    chosen = accounts.find(account => account.name === name);
  }

  if (!chosen) {
    throw new Error('No billing account selected. Pass --billing-account <id>, or link one here:\n' + `      ${linkUrl}`);
  }

  await linkBillingAccount(projectId, chosen.name);
  log.done(`linked ${chosen.displayName}`);

  // A fresh link takes up to a minute to reach Service Usage, which otherwise
  // rejects the Blaze-gated APIs in the very next step.
  for (let attempt = 1; attempt <= 12; attempt++) {
    if (await isBillingEnabled(projectId)) {
      log.done('billing is active');
      return;
    }
    await new Promise(done => setTimeout(done, 5000));
  }
  log.skip('billing not visible yet; continuing (API enablement will retry)');
}

async function enableApis(projectId) {
  log.step(`Enabling ${REQUIRED_APIS.length} APIs`);
  for (const api of REQUIRED_APIS) {
    await enableApi(projectId, api);
    log.done(api);
  }
}

/**
 * Creates the database if missing, and returns the region the whole setup should use.
 *
 * The Firestore location is immutable and therefore the authoritative answer for an
 * existing project: adopting it here is what makes a re-run safe. Defaulting to
 * `europe-west6` instead would quietly rewrite the config of a project provisioned
 * elsewhere, leaving Functions pointed away from its own data.
 */
async function ensureFirestore(projectId) {
  log.step('Setting up Firestore');
  const databases = await cli.listFirestoreDatabases(projectId);
  const existing = databases?.find(database => database.name?.endsWith('/databases/(default)'));

  if (existing) {
    const actual = existing.locationId;
    if (opts.region && opts.region !== actual) {
      throw new Error(
        `Firestore is already in ${actual} and cannot be moved. Re-run with --region ${actual}, or create a new project to use ${opts.region}.`,
      );
    }
    log.skip(`default database already exists in ${actual}`);
    return actual;
  }

  // Only ask when we are about to create: on an existing database the location above is
  // immutable, so a prompt would offer a choice that cannot be honoured.
  const region = opts.region ?? (opts.yes ? DEFAULT_REGION : await chooseRegion());
  await cli.createFirestoreDatabase(projectId, '(default)', region);
  log.done(`created default database in ${region}`);
  return region;
}

async function ensureStorage(projectId, region) {
  log.step('Setting up Cloud Storage');
  const existing = await getDefaultBucket(projectId);
  if (existing) {
    log.skip(`default bucket already exists (${existing})`);
    return;
  }
  const bucket = await createDefaultBucket(projectId, region);
  log.done(`created default bucket ${bucket ?? ''} in ${region}`);
}

/** Returns the web app id, creating the app if the project has none. */
async function ensureWebApp(projectId) {
  log.step('Setting up web app');
  const apps = await cli.listWebApps(projectId);
  if (apps?.length > 0) {
    log.skip(`using existing web app ${apps[0].appId}`);
    return apps[0].appId;
  }
  const created = await cli.createWebApp(projectId, WEB_APP_NAME);
  log.done(`created web app ${created.appId}`);
  return created.appId;
}

async function ensureHostingSite(projectId) {
  log.step('Setting up Hosting');
  const sites = await cli.listHostingSites(projectId);
  if (sites?.length > 0) {
    log.skip(`site already exists (${sites[0].name?.split('/').pop()})`);
    return;
  }
  await cli.createHostingSite(projectId, projectId);
  log.done(`created hosting site ${projectId}`);
}

/**
 * Stamps the project so any machine can tell it is a Localess installation.
 *
 * This is not best-effort any more: `npm run localess:deploy` refuses a project without the label,
 * so a silent failure here would produce a fully provisioned, permanently undeployable
 * project. Failing loudly lets the operator grant the role and re-run - setup is idempotent.
 */
async function markProject(projectId, region) {
  log.step('Marking the project as Localess-managed');
  const labels = buildMarkerLabels(VERSION, region);
  try {
    await mergeProjectLabels(projectId, labels);
  } catch (error) {
    throw new Error(
      `Could not write the Localess project labels (${error.message}).\n\n` +
        '  Deploy refuses a project without them, so setup stops here. The account needs\n' +
        `  resourcemanager.projects.update on ${projectId} - grant it and re-run.\n`,
    );
  }
  log.done(
    Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)
      .join(', '),
  );
}

function summary(projectId) {
  console.log(`\n\x1b[1m\x1b[32mProject ${projectId} is ready.\x1b[0m\n`);
  console.log(`Your decisions are saved in .env.${projectId}. Edit it to set the login`);
  console.log('providers, login message and Unsplash flag - they are baked into the bundle');
  console.log('at build time, so they need a deploy to take effect.\n');

  console.log('Email/password sign-in is provisioned on the first deploy. Other providers');
  console.log('are configured in the Firebase console.\n');
}

/**
 * Setup provisions infrastructure; it never ships the application on its own. Offer the
 * deploy so the happy path is one session, but default to no and make `--yes` skip it -
 * an unattended run must not push code.
 */
async function offerDeploy(projectId) {
  if (opts.yes || !(await confirmDeploy(projectId))) {
    console.log(`\nDeploy when you are ready:\n\n  npm run localess:deploy -- --project ${projectId}\n`);
    console.log(`Then create the first admin user at https://${projectId}.web.app/setup\n`);
    return;
  }

  await new Promise((done, fail) => {
    const child = spawn('npm', ['run', 'localess:deploy', '--', '--project', projectId, '--yes'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', fail);
    child.on('close', code => (code === 0 ? done() : fail(new Error(`npm run localess:deploy exited with code ${code}`))));
  });

  console.log(`Create the first admin user at https://${projectId}.web.app/setup\n`);
}

export async function run(argv) {
  parseOptions(argv);

  await preflight();
  const projectId = await resolveProject();
  await ensureBilling(projectId);
  await enableApis(projectId);
  const region = await ensureFirestore(projectId);
  await ensureStorage(projectId, region);
  await ensureWebApp(projectId);
  await ensureHostingSite(projectId);
  await markProject(projectId, region);
  log.step('Writing local configuration');
  await syncLocalFiles(projectId, { region, log });
  summary(projectId);
  await offerDeploy(projectId);
}
