#!/usr/bin/env node
/**
 * One-command Firebase provisioning for a local Localess checkout.
 *
 * Usage:
 *   npm run setup:firebase -- --project <project-id> [options]
 *   npm run setup:firebase                              # creates a new project
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
 *   --google-support-email    Enables Google sign-in with this support email
 *   --yes                     Never prompt; fail instead
 *
 * Every step is idempotent: re-run after a failure and completed work is
 * detected and skipped.
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { cli } from './setup/firebase-cli.mjs';
import { DEFAULT_REGION, listProjectConfigs, writeProjectConfig } from './setup/config.mjs';
import { writeFunctionsEnv } from './setup/generate.mjs';
import {
  CREATE_NEW,
  askNewProject,
  chooseBillingAccount,
  chooseProject,
  chooseRegion,
  confirmDeploy,
  confirmProvision,
  isPromptAbort,
} from './setup/prompts.mjs';
import { isSupportedRegion } from './setup/regions.mjs';
import { firebaseTools } from './setup/firebase-tools.mjs';
import {
  authenticate,
  createDefaultBucket,
  enableApi,
  getDefaultBucket,
  isBillingEnabled,
  linkBillingAccount,
  listOpenBillingAccounts,
  listAllProjectLabels,
  mergeProjectLabels,
  readProjectLabels,
} from './setup/firebase-gaps.mjs';
import { WEB_APP_NAME, buildMarkerLabels, describeProject, hasMarker } from './setup/markers.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/** Recorded in the project label so the console shows which release provisioned it. */
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

/** Paths are logged relative to the repo root - absolute ones are noise. */
const rel = path => relative(ROOT, path);

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

const USAGE = 'Usage: npm run setup:firebase -- [--project <id>] [--region <region>] [--billing-account <id>] [--google-support-email <email>] [--yes]';

/** Flags that used to exist, with the message to show instead of a bare parse error. */
const REMOVED_FLAGS = {
  '--location': 'Firestore, Storage and Cloud Functions now share one region. Use --region instead.',
  '--storage-location': 'Firestore, Storage and Cloud Functions now share one region. Use --region instead.',
};

for (const [flag, hint] of Object.entries(REMOVED_FLAGS)) {
  if (process.argv.some(arg => arg === flag || arg.startsWith(`${flag}=`))) {
    console.error(`\n\x1b[31m${flag} has been removed.\x1b[0m ${hint}\n\n  ${USAGE}\n`);
    process.exit(1);
  }
}

// parseArgs throws on an unknown flag; catch it so a typo prints usage, not a stack trace.
let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      project: { type: 'string' },
      'display-name': { type: 'string' },
      region: { type: 'string' },
      'billing-account': { type: 'string' },
      'google-support-email': { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  }));
} catch (error) {
  console.error(`\n\x1b[31m${error.message}\x1b[0m\n\n  ${USAGE}\n`);
  process.exit(1);
}

// Rule: a missing parameter is asked for, never guessed. An unsupported --region is
// treated as missing so the user gets the picker instead of a late failure from the API.
if (opts.region && !isSupportedRegion(opts.region)) {
  const message = `${opts.region} is not a region where Firestore, Storage and Cloud Functions are all available.`;
  if (opts.yes) {
    console.error(`\n\x1b[31m${message}\x1b[0m Pass a supported --region.\n`);
    process.exit(1);
  }
  console.warn(`\n\x1b[33m${message}\x1b[0m You will be asked to choose one.`);
  opts.region = undefined;
}

let stepNumber = 0;
const log = {
  step: msg => console.log(`\n\x1b[1m[${++stepNumber}] ${msg}\x1b[0m`),
  done: msg => console.log(`    \x1b[32m+\x1b[0m ${msg}`),
  skip: msg => console.log(`    \x1b[90m-\x1b[0m ${msg}`),
};

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
 * Builds the picker annotations from three signals.
 *
 * Labels for every project arrive in a single Cloud Resource Manager call, so the version
 * can be shown for any managed project - including ones this machine has never configured,
 * which is the case after a fresh clone. Local `.env.<project-id>` config adds "configured
 * here", and is deliberately never trusted on its own: it can be stale if the project was
 * deleted or rebuilt elsewhere.
 *
 * The web-app fallback costs one call per project, so it is only used where it can change
 * the answer: a locally-configured project that carries no label.
 */
async function annotateProjects(projects) {
  const configured = new Set(listProjectConfigs(ROOT));
  const labelsByProject = await listAllProjectLabels();

  const annotations = {};
  await Promise.all(
    projects.map(async project => {
      const projectId = project.projectId;
      const configuredLocally = configured.has(projectId);
      const labels = labelsByProject?.get(projectId);

      if (!configuredLocally && !hasMarker(labels)) return;

      if (labelsByProject === null && !configuredLocally) return;
      if (labelsByProject === null) {
        annotations[projectId] = describeProject({ configuredLocally, remote: { reachable: false } });
        return;
      }

      const needsFallback = configuredLocally && !hasMarker(labels);
      const apps = needsFallback ? await cli.listWebApps(projectId).catch(() => null) : null;

      annotations[projectId] = describeProject({
        configuredLocally,
        remote: {
          reachable: true,
          labels: labels ?? {},
          hasLocalessWebApp: Boolean(apps?.some(app => app.displayName === WEB_APP_NAME)),
        },
      });
    }),
  );

  return annotations;
}

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
  console.log('      - link a billing account if one is not already active');
  console.log('      - deploy an authentication configuration over the current one\n');

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

  const annotations = await annotateProjects(projects);

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

/**
 * Writes the Google sign-in provider into firebase.json when a support email
 * was supplied. The provisioning API generates the OAuth client itself, so no
 * console visit is needed — but the support email is per-installation and so
 * cannot be committed to the repo.
 */
async function configureAuthProviders(projectId) {
  log.step('Provisioning Authentication');

  if (opts['google-support-email']) {
    const path = resolve(ROOT, 'firebase.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    config.auth.providers.googleSignIn = {
      oAuthBrandDisplayName: 'Localess',
      supportEmail: opts['google-support-email'],
      authorizedRedirectUris: [`https://${projectId}.firebaseapp.com/__/auth/handler`],
    };
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
    log.done('added Google sign-in to firebase.json');
  }

  await cli.deployAuth(projectId);
  log.done('Identity Platform and providers provisioned');
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

/** Writes the two files the local build and the functions deploy need. */
async function writeLocalConfig(projectId, appId, region) {
  log.step('Writing local configuration');

  // `apps:sdkconfig --out` refuses to overwrite, so write beside the target
  // and move it into place. cloudbuild.yaml does the same for the same reason.
  const configPath = resolve(ROOT, 'src/environments/firebase-config.json');
  const tempPath = `${configPath}.tmp`;
  await rm(tempPath, { force: true });
  await cli.writeSdkConfig(projectId, appId, tempPath);
  await rm(configPath, { force: true });
  await rename(tempPath, configPath);
  log.done('src/environments/firebase-config.json');

  log.done(`${rel(writeFunctionsEnv(ROOT, projectId, region))} (REGION=${region})`);

  // The handoff to `npm run deploy`: everything that cannot be read back from the live
  // project. Gitignored, so re-running setup never shows up as a diff.
  writeProjectConfig(ROOT, projectId, {
    LOCALESS_PROJECT_ID: projectId,
    LOCALESS_REGION: region,
    LOCALESS_AUTH_PROVIDERS: opts['google-support-email'] ? 'GOOGLE' : '',
    LOCALESS_AUTH_CUSTOM_DOMAIN: '',
    LOCALESS_LOGIN_MESSAGE: '',
    LOCALESS_UNSPLASH_ENABLE: '',
  });
  log.done(`.env.${projectId}`);
}

/**
 * Stamps the project so a later run - or a fresh clone with no local config - can tell it
 * is managed by Localess. Best-effort: a missing label costs a confirmation prompt, which
 * is not worth failing an otherwise complete setup over.
 */
async function markProject(projectId) {
  log.step('Marking the project as Localess-managed');
  const labels = buildMarkerLabels(VERSION);
  try {
    await mergeProjectLabels(projectId, labels);
    log.done(Object.entries(labels).map(([key, value]) => `${key}=${value}`).join(', '));
  } catch (error) {
    log.skip(`could not set project labels (${error.message})`);
  }
}

function summary(projectId) {
  console.log(`\n\x1b[1m\x1b[32mProject ${projectId} is ready.\x1b[0m\n`);
  console.log(`Your decisions are saved in .env.${projectId}. Edit it to set the login`);
  console.log('providers, login message and Unsplash flag - they are baked into the bundle');
  console.log('at build time, so they need a deploy to take effect.\n');

  if (!opts['google-support-email']) {
    console.log('Email/password sign-in is enabled. To add Google sign-in, re-run with');
    console.log('--google-support-email <email>. Microsoft sign-in needs an Azure app');
    console.log('registration and must be configured in the Firebase console.\n');
  }
}

/**
 * Setup provisions infrastructure; it never ships the application on its own. Offer the
 * deploy so the happy path is one session, but default to no and make `--yes` skip it -
 * an unattended run must not push code.
 */
async function offerDeploy(projectId) {
  if (opts.yes || !(await confirmDeploy(projectId))) {
    console.log(`\nDeploy when you are ready:\n\n  npm run deploy -- --project ${projectId}\n`);
    console.log(`Then create the first admin user at https://${projectId}.web.app/setup\n`);
    return;
  }

  await new Promise((done, fail) => {
    const child = spawn('npm', ['run', 'deploy', '--', '--project', projectId], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', fail);
    child.on('close', code => (code === 0 ? done() : fail(new Error(`npm run deploy exited with code ${code}`))));
  });

  console.log(`Create the first admin user at https://${projectId}.web.app/setup\n`);
}

try {
  await preflight();
  const projectId = await resolveProject();
  await ensureBilling(projectId);
  await enableApis(projectId);
  const region = await ensureFirestore(projectId);
  await ensureStorage(projectId, region);
  const appId = await ensureWebApp(projectId);
  await configureAuthProviders(projectId);
  await ensureHostingSite(projectId);
  await writeLocalConfig(projectId, appId, region);
  await markProject(projectId);
  summary(projectId);
  await offerDeploy(projectId);
} catch (error) {
  if (isPromptAbort(error)) {
    console.error('\n\x1b[90mCancelled. Re-run when ready - completed steps are skipped.\x1b[0m\n');
    process.exit(130);
  }
  console.error(`\n\x1b[31mSetup failed:\x1b[0m ${error.message}\n`);
  console.error('Fix the issue above and re-run - completed steps are skipped.\n');
  process.exit(1);
}
