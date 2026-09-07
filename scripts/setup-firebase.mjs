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
 *   --location <loc>          Firestore location              (default: eur3)
 *   --region <region>         Cloud Functions region          (default: europe-west6)
 *   --storage-location <loc>  Default Storage bucket location (default: --region)
 *   --billing-account <id>    Billing account to link when Blaze is not active
 *   --google-support-email    Enables Google sign-in with this support email
 *   --yes                     Never prompt; fail instead
 *
 * Every step is idempotent: re-run after a failure and completed work is
 * detected and skipped.
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { cli } from './setup/firebase-cli.mjs';
import { firebaseTools } from './setup/firebase-tools.mjs';
import {
  authenticate,
  createDefaultBucket,
  enableApi,
  getDefaultBucket,
  isBillingEnabled,
  linkBillingAccount,
  listOpenBillingAccounts,
} from './setup/firebase-gaps.mjs';

const ROOT = resolve(import.meta.dirname, '..');

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

const { values: opts } = parseArgs({
  options: {
    project: { type: 'string' },
    'display-name': { type: 'string' },
    location: { type: 'string', default: 'eur3' },
    region: { type: 'string', default: 'europe-west6' },
    'storage-location': { type: 'string' },
    'billing-account': { type: 'string' },
    'google-support-email': { type: 'string' },
    yes: { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const storageLocation = opts['storage-location'] ?? opts.region;

let stepNumber = 0;
const log = {
  step: msg => console.log(`\n\x1b[1m[${++stepNumber}] ${msg}\x1b[0m`),
  done: msg => console.log(`    \x1b[32m+\x1b[0m ${msg}`),
  skip: msg => console.log(`    \x1b[90m-\x1b[0m ${msg}`),
};

async function ask(question) {
  if (opts.yes) return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(`    ${question} `)).trim();
  } finally {
    rl.close();
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
async function resolveProject() {
  log.step('Resolving Firebase project');

  if (opts.project) {
    // `firebase use` is the validator here: it exits non-zero for a project
    // that does not exist or is not accessible. Scanning `projects:list`
    // instead is unreliable — a freshly created project can take minutes to
    // appear there.
    await cli.useProject(opts.project);
    log.done(`using existing project ${opts.project}`);
    return opts.project;
  }

  const projectId = await ask('No --project given. Enter a new project id to create:');
  if (!projectId) {
    throw new Error('A project id is required. Pass --project <id> to adopt an existing project.');
  }
  await cli.createProject(projectId, opts['display-name'] ?? 'Localess');
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
  } else {
    accounts.forEach((account, index) => console.log(`    ${index + 1}) ${account.displayName}`));
    const answer = await ask(`Link which billing account? [1-${accounts.length}]`);
    chosen = accounts[Number(answer) - 1];
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

async function ensureFirestore(projectId) {
  log.step('Setting up Firestore');
  const databases = await cli.listFirestoreDatabases(projectId);
  if (databases?.some(database => database.name?.endsWith('/databases/(default)'))) {
    log.skip('default database already exists');
    return;
  }
  await cli.createFirestoreDatabase(projectId, '(default)', opts.location);
  log.done(`created default database in ${opts.location}`);
}

async function ensureStorage(projectId) {
  log.step('Setting up Cloud Storage');
  const existing = await getDefaultBucket(projectId);
  if (existing) {
    log.skip(`default bucket already exists (${existing})`);
    return;
  }
  const bucket = await createDefaultBucket(projectId, storageLocation);
  log.done(`created default bucket ${bucket ?? ''} in ${storageLocation}`);
}

/** Returns the web app id, creating the app if the project has none. */
async function ensureWebApp(projectId) {
  log.step('Setting up web app');
  const apps = await cli.listWebApps(projectId);
  if (apps?.length > 0) {
    log.skip(`using existing web app ${apps[0].appId}`);
    return apps[0].appId;
  }
  const created = await cli.createWebApp(projectId, 'Localess');
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
async function writeLocalConfig(projectId, appId) {
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

  const envPath = resolve(ROOT, 'functions/.env');
  await writeFile(envPath, `REGION=${opts.region}\n`);
  log.done(`functions/.env (REGION=${opts.region})`);
}

function summary(projectId) {
  console.log(`\n\x1b[1m\x1b[32mProject ${projectId} is ready.\x1b[0m\n`);
  console.log('Deploy it from here:\n');
  console.log('  npm install');
  console.log('  npm --prefix functions install');
  console.log('  npm run build:prod');
  console.log(`  npx firebase deploy --project ${projectId}\n`);
  console.log(`Then create the first admin user at https://${projectId}.web.app/setup\n`);

  if (!opts['google-support-email']) {
    console.log('Email/password sign-in is enabled. To add Google sign-in, re-run with');
    console.log('--google-support-email <email>. Microsoft sign-in needs an Azure app');
    console.log('registration and must be configured in the Firebase console.\n');
  }
}

try {
  await preflight();
  const projectId = await resolveProject();
  await ensureBilling(projectId);
  await enableApis(projectId);
  await ensureFirestore(projectId);
  await ensureStorage(projectId);
  const appId = await ensureWebApp(projectId);
  await configureAuthProviders(projectId);
  await ensureHostingSite(projectId);
  await writeLocalConfig(projectId, appId);
  summary(projectId);
} catch (error) {
  console.error(`\n\x1b[31mSetup failed:\x1b[0m ${error.message}\n`);
  console.error('Fix the issue above and re-run - completed steps are skipped.\n');
  process.exit(1);
}
