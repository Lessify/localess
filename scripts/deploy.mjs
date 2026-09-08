#!/usr/bin/env node
/**
 * Build and deploy Localess to a configured Firebase project.
 *
 * Usage:
 *   npm run deploy                       # the only configured project
 *   npm run deploy -- --project <id>     # pick one when several are configured
 *   npm run deploy -- --dry-run          # generate artifacts, print the command, stop
 *
 * Pushes hosting, functions, storage and firestore by default - the same set as
 * cloudbuild.yaml. Narrow or widen it with `--only`.
 *
 * Reads `.env.<project-id>` for the decisions, and fetches everything else from the live
 * project - the same pattern cloudbuild.yaml uses. No tracked file is modified.
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { rm, rename } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { cli } from './setup/firebase-cli.mjs';
import { firebaseTools } from './setup/firebase-tools.mjs';
import { readProjectConfig, requireRegion, resolveProjectId } from './setup/config.mjs';
import { writeFirebaseJson, writeFunctionsEnv } from './setup/generate.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * What a deploy pushes unless `--only` says otherwise. Matches cloudbuild.yaml so a local
 * deploy and a CI deploy do the same thing. `auth` is deliberately excluded - it is
 * provisioning, owned by `npm run setup:firebase` - and so is `remoteconfig`, which would
 * otherwise overwrite console-side edits on every deploy.
 */
const DEFAULT_TARGETS = 'hosting,functions,storage,firestore';

/** Paths are logged relative to the repo root - absolute ones are noise. */
const rel = path => relative(ROOT, path);

const USAGE = 'Usage: npm run deploy -- [--project <id>] [--only <targets>] [--skip-install] [--skip-build] [--dry-run]';

// parseArgs throws on an unknown flag; catch it so a typo prints usage, not a stack trace.
let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      project: { type: 'string' },
      only: { type: 'string' },
      'skip-install': { type: 'boolean', default: false },
      'skip-build': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  }));
} catch (error) {
  console.error(`\n\x1b[31m${error.message}\x1b[0m\n\n  ${USAGE}\n`);
  process.exit(1);
}

let stepNumber = 0;
const log = {
  step: msg => console.log(`\n\x1b[1m[${++stepNumber}] ${msg}\x1b[0m`),
  done: msg => console.log(`    \x1b[32m+\x1b[0m ${msg}`),
  skip: msg => console.log(`    \x1b[90m-\x1b[0m ${msg}`),
};

/** Runs a command with the loaded config on top of the ambient environment. */
function run(command, args, env) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', env, shell: process.platform === 'win32' });
    child.on('error', fail);
    child.on('close', code => (code === 0 ? done() : fail(new Error(`${command} ${args.join(' ')} exited with code ${code}`))));
  });
}

async function preflight() {
  log.step('Checking prerequisites');
  log.done(`firebase-tools ${firebaseTools().version}`);

  const accounts = await cli.loggedInAccounts();
  if (accounts.length === 0) {
    throw new Error('Not logged in. Run `npx firebase login` and try again.');
  }
  log.done(`authenticated as ${accounts.join(', ')}`);
}

/**
 * Pulls the web SDK config from the live project. `apps:sdkconfig --out` refuses to
 * overwrite, so write beside the target and move it into place - the same approach
 * cloudbuild.yaml uses.
 */
async function fetchSdkConfig(projectId) {
  log.step('Fetching Firebase SDK config');

  const apps = await cli.listWebApps(projectId);
  if (!apps || apps.length === 0) {
    throw new Error(`Project ${projectId} has no web app. Run: npm run setup:firebase -- --project ${projectId}`);
  }

  const target = resolve(ROOT, 'src/environments/firebase-config.json');
  const temp = `${target}.tmp`;
  await rm(temp, { force: true });
  await cli.writeSdkConfig(projectId, apps[0].appId, temp);
  await rm(target, { force: true });
  await rename(temp, target);
  log.done(`src/environments/firebase-config.json (app ${apps[0].appId})`);
}

try {
  const projectId = resolveProjectId(ROOT, { flag: opts.project });
  const config = readProjectConfig(ROOT, projectId);

  const declared = config.LOCALESS_PROJECT_ID;
  if (declared && declared !== projectId) {
    throw new Error(`.env.${projectId} declares LOCALESS_PROJECT_ID=${declared}. The filename is authoritative - fix one of them.`);
  }

  const region = requireRegion(config);
  // The config file wins over anything already in the shell, so a stale exported
  // LOCALESS_* variable cannot silently change what gets built.
  const env = { ...process.env, ...config, LOCALESS_PROJECT_ID: projectId };

  console.log(`\n\x1b[1mDeploying ${projectId}\x1b[0m (region ${region}, targets ${opts.only ?? DEFAULT_TARGETS})`);

  await preflight();
  await fetchSdkConfig(projectId);

  log.step('Generating build artifacts');
  log.done(`${rel(writeFunctionsEnv(ROOT, projectId, region))} (REGION=${region})`);
  const configPath = writeFirebaseJson(ROOT, projectId, region);
  log.done(rel(configPath));

  const targets = opts.only ?? DEFAULT_TARGETS;
  const deployArgs = ['deploy', '--config', rel(configPath), '--project', projectId, '--only', targets, '--non-interactive'];

  if (opts['dry-run']) {
    console.log(`\n\x1b[1mDry run.\x1b[0m Would run:\n\n  npm run build:prod\n  npx firebase ${deployArgs.join(' ')}\n`);
    process.exit(0);
  }

  if (opts['skip-install']) {
    log.step('Installing dependencies');
    log.skip('skipped (--skip-install)');
  } else {
    log.step('Installing dependencies');
    await run('npm', ['install'], env);
    await run('npm', ['--prefix', 'functions', 'install'], env);
    log.done('root and functions');
  }

  if (opts['skip-build']) {
    log.step('Building');
    log.skip('skipped (--skip-build)');
  } else {
    log.step('Building');
    await run('npm', ['run', 'build:prod'], env);
    log.done('dist/localess/browser');
  }

  log.step('Deploying');
  await run(process.execPath, [firebaseTools().binPath, ...deployArgs], env);

  console.log(`\n\x1b[1m\x1b[32m${projectId} deployed.\x1b[0m\n`);
  console.log(`  https://${projectId}.web.app\n`);
} catch (error) {
  console.error(`\n\x1b[31mDeploy failed:\x1b[0m ${error.message}\n`);
  process.exit(1);
}
