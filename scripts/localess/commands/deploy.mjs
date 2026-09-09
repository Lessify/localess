/**
 * Build and deploy Localess to a project Localess manages.
 *
 * The marker gate is the point of this command's front half: a mistyped project id would
 * otherwise install a CMS over something unrelated. Everything the build needs is either
 * read from the live project or regenerated from it, so a fresh clone can deploy with no
 * local state at all.
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cli } from '../firebase-cli.mjs';
import { firebaseTools } from '../firebase-tools.mjs';
import { DEFAULT_REGION, readProjectConfig } from '../config.mjs';
import { toDefineArgs } from '../defines.mjs';
import { buildDeployArgs, parseTargets } from '../deploy-plan.mjs';
import { buildMarkerLabels } from '../markers.mjs';
import { mergeProjectLabels } from '../firebase-gaps.mjs';
import { assertManaged, identifyProject } from '../projects.mjs';
import { confirmDeployPlan } from '../prompts.mjs';
import { ROOT, createLogger, rel } from '../log.mjs';
import { UsageError } from '../usage.mjs';
import { liveRegion, refreshRegionLabel, resolveProjectSelection, syncLocalFiles } from './sync.mjs';

export const USAGE =
  'Usage: npm run localess:deploy -- [--project <id>] [--only <targets>] [--skip-install] [--skip-build] [--dry-run] [--yes]';

/** Stamped onto the project after a successful deploy, so the label says what is live. */
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

const log = createLogger();

/** Runs a command with the loaded config on top of the ambient environment. */
function exec(command, args, env) {
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

export async function run(argv) {
  let opts;
  try {
    ({ values: opts } = parseArgs({
      args: argv,
      options: {
        project: { type: 'string' },
        only: { type: 'string' },
        'skip-install': { type: 'boolean', default: false },
        'skip-build': { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        yes: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError(error.message);
  }

  // Validated before anything is touched, so a typo costs nothing.
  const targets = parseTargets(opts.only);

  if (!opts.project && opts.yes) {
    throw new UsageError('--yes was given without --project. Pass --project <id> to choose non-interactively.');
  }

  await preflight();

  const projectId = opts.project ?? (await resolveProjectSelection(log));

  log.step('Checking the Localess marker');
  const identity = await identifyProject(projectId);
  assertManaged(projectId, identity);
  log.done(`${projectId} is managed by Localess${identity.version ? ` ${identity.version}` : ''}`);

  log.step('Reading the live region');
  const region = (await liveRegion(projectId)) ?? identity.region ?? DEFAULT_REGION;
  log.done(region);

  log.step('Writing local project files');
  await syncLocalFiles(projectId, { region, log });
  await refreshRegionLabel(projectId, region, identity, log);

  // Read back what sync just wrote, so the build sees exactly what is on disk.
  const config = readProjectConfig(ROOT, projectId);
  // The config file wins over anything already in the shell, so a stale exported LOCALESS_*
  // variable cannot silently change what gets built.
  const env = { ...process.env, ...config, LOCALESS_PROJECT_ID: projectId };

  const configPath = resolve(ROOT, `firebase.${projectId}.json`);
  const deployArgs = buildDeployArgs({ configPath: rel(configPath), projectId, targets });
  const defineArgs = toDefineArgs(config);

  if (opts['dry-run']) {
    console.log(
      `\n\x1b[1mDry run.\x1b[0m Would run:\n\n  npm run build:deploy -- ${defineArgs.join(' ')}\n  npx firebase ${deployArgs.join(' ')}\n`,
    );
    return;
  }

  if (!opts.yes && !(await confirmDeployPlan({ projectId, region, targets }))) {
    console.log('\nNothing was deployed.\n');
    return;
  }

  log.step('Installing dependencies');
  if (opts['skip-install']) {
    log.skip('skipped (--skip-install)');
  } else {
    await exec('npm', ['install'], env);
    await exec('npm', ['--prefix', 'functions', 'install'], env);
    log.done('root and functions');
  }

  log.step('Building');
  if (opts['skip-build']) {
    log.skip('skipped (--skip-build)');
  } else {
    await exec('npm', ['run', 'build:deploy', '--', ...defineArgs], env);
    log.done('dist/localess/browser');
  }

  log.step('Deploying');
  await exec(process.execPath, [firebaseTools().binPath, ...deployArgs], env);

  log.step('Refreshing the version marker');
  try {
    await mergeProjectLabels(projectId, buildMarkerLabels(VERSION, region));
    log.done(`localess-version=${VERSION}`);
  } catch (error) {
    // The deploy succeeded; a stale label is not worth reporting it as a failure.
    log.skip(`could not update the version label (${error.message})`);
  }

  console.log(`\n\x1b[1m\x1b[32m${projectId} deployed.\x1b[0m\n`);
  console.log(`  https://${projectId}.web.app\n`);
}
