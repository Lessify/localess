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
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cli } from '../firebase-cli.mjs';
import { firebaseTools } from '../firebase-tools.mjs';
import { DEFAULT_REGION, readProjectConfig } from '../config.mjs';
import { toDefineArgs } from '../defines.mjs';
import { buildDeployArgs, parseTargets } from '../deploy-plan.mjs';
import { buildMarkerLabels } from '../markers.mjs';
import { mergeProjectLabels } from '../firebase-gaps.mjs';
import { ensureRequiredApis } from '../apis.mjs';
import { ensureBucketCors } from '../bucket-cors.mjs';
import { assertManaged, identifyProject } from '../projects.mjs';
import { confirmDeployPlan } from '../prompts.mjs';
import { ROOT, createLogger, rel } from '../log.mjs';
import { UsageError } from '../usage.mjs';
import { liveRegion, refreshRegionLabel, resolveProjectSelection, syncLocalFiles } from './sync.mjs';

export const USAGE =
  'Usage: npm run localess:deploy -- [--project <id>] [--only <targets>] [--skip-install] [--skip-build] [--dry-run] [--yes]';

/** Stamped onto the project after a successful deploy, so the label says what is live. */
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

/**
 * The Angular build, mirroring the `build:deploy` npm script. Spelled out here rather than
 * run through `npm run` because the `--define` values must reach esbuild with their quotes
 * intact, and on Windows that rules out a shell - see `exec`.
 */
const BUILD_ARGS = Object.freeze(['build', '--configuration', 'production,deploy']);

const log = createLogger();

/**
 * Runs a command with the loaded config on top of the ambient environment.
 *
 * A shell is used only for `npm`, whose Windows entry point is a `.cmd` shim Node will not
 * spawn directly. Nothing else may go through one: with `shell: true` Node concatenates
 * argv into a single string without escaping it (Node's own DEP0190), so cmd.exe strips
 * the quotes that make a `--define` value a JS literal and esbuild rejects the build. That
 * is why the Angular build below is spawned straight from `process.execPath`.
 */
function exec(command, args, env, cwd = ROOT) {
  const shell = process.platform === 'win32' && command === 'npm';
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env, shell });
    child.on('error', fail);
    child.on('close', code => (code === 0 ? done() : fail(new Error(`${command} ${args.join(' ')} exited with code ${code}`))));
  });
}

/**
 * The Angular CLI entry point, resolved lazily because a fresh clone has no node_modules
 * until the install step above has run.
 */
function ngBinPath() {
  return createRequire(import.meta.url).resolve('@angular/cli/bin/ng.js');
}

/**
 * Runs a command, streaming its output and returning it as well.
 *
 * The deploy needs both: the operator watches it live, and `deployFunctionFailures` has to
 * read it afterwards. Spinners degrade to plain lines through a pipe, which is an
 * acceptable price for being able to tell a real failure from a reported success.
 */
function execCapture(command, args, env, cwd = ROOT) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env });
    let output = '';
    for (const [stream, sink] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      stream.on('data', chunk => {
        output += chunk;
        sink.write(chunk);
      });
    }
    child.on('error', fail);
    child.on('close', code => done({ code, output }));
  });
}

/**
 * The functions `firebase deploy` said it could not create or update.
 *
 * Needed because the exit code does not say: the CLI reports these as warnings and still
 * exits 0, so a first deploy can lose `publicv1` and every event trigger while announcing
 * success. The names are pulled out so the failure message can list them.
 */
export function deployFunctionFailures(output) {
  const names = new Set();
  for (const match of output.matchAll(/failed to (?:create|update) function (\S+)/gi)) {
    names.add(match[1].split('/').pop());
  }
  return [...names];
}

/**
 * Whether a non-zero exit is only the missing Artifact Registry cleanup policy.
 *
 * The CLI says it plainly - the functions deployed, it just wanted to ask about the policy
 * and `--non-interactive` forbids the question. Retrying that is pure waste, and reporting
 * it as a failed deploy is wrong: `ensureArtifactPolicy` sets the policy separately.
 */
export function isCleanupPolicyOnlyFailure(output) {
  return /Functions successfully deployed but could not set up cleanup policy/i.test(output);
}

/**
 * Deploys, retrying while functions fail for reasons only a fresh project hits.
 *
 * A first deploy races its own provisioning: the `gcf-v2-sources` bucket and the Eventarc
 * service agent's permissions are still propagating, so event-triggered functions and
 * `publicv1` fail to create. Both resolve within minutes, which is why this retries rather
 * than gives up - the same reasoning as `enableApi` and `withPropagationRetry`.
 *
 * The whole command is retried, not just `--only functions`: hosting released against a
 * missing `publicv1` serves a dead `/api/v1/**` rewrite until it is released again.
 */
async function deployWithRetry(deployArgs, env, { attempts = 3, delayMs = 30000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const { code, output } = await execCapture(process.execPath, [firebaseTools().binPath, ...deployArgs], env);
    const failures = deployFunctionFailures(output);

    if (failures.length === 0 && (code === 0 || isCleanupPolicyOnlyFailure(output))) return;

    if (attempt === attempts) {
      if (failures.length > 0) {
        throw new Error(
          `${failures.length} function(s) could not be deployed after ${attempts} attempts: ${failures.join(', ')}.\n\n` +
            '  These usually fail because a freshly provisioned project is still propagating\n' +
            '  permissions. Wait a few minutes and re-run the same command.\n',
        );
      }
      throw new Error(`firebase ${deployArgs.join(' ')} exited with code ${code}`);
    }

    log.warn(
      failures.length > 0
        ? `${failures.length} function(s) failed (${failures.join(', ')}); retrying in ${delayMs / 1000}s`
        : `deploy exited with code ${code}; retrying in ${delayMs / 1000}s`,
    );
    await new Promise(wait => setTimeout(wait, delayMs));
  }
}

/**
 * What `functions:artifacts:setpolicy` did, read back out of its own output.
 *
 * The retention is reported rather than assumed: we deliberately pass no `--days`, so the
 * number is firebase-tools' default (1 day today) and printing our own copy of it would be
 * a second source of truth that silently goes stale if that default ever moves.
 *
 * Order matters. A run that changes an existing policy prints the OLD retention first, as a
 * "Note:", so the `Successfully` line has to win over any earlier mention.
 */
export function cleanupPolicyOutcome(output) {
  if (/does not exist in Artifact Registry/i.test(output)) return { state: 'missing-repo' };

  const applied = output.match(/Successfully (?:set up|updated) cleanup policy[\s\S]*?older than (\S+) days/i);
  if (applied) return { state: 'applied', days: applied[1] };

  const existing = output.match(/cleanup policy already exists that deletes images older than (\S+) days/i);
  if (existing) return { state: 'unchanged', days: existing[1] };

  return { state: 'unknown' };
}

/**
 * Verifies - and if needed sets - the Artifact Registry cleanup policy for function images.
 *
 * Done here rather than in setup because the `gcf-artifacts` repository does not exist
 * until functions have been deployed once - setup would only ever no-op. Without it the
 * CLI asks for the policy on the next deploy and, being `--non-interactive`, fails a
 * deployment that otherwise fully succeeded.
 *
 * No `--days`: the firebase-tools default of 1 day is what we want. The images are build
 * artifacts - Cloud Run functions keeps its own copy of what it serves - so nothing at
 * runtime depends on how long they are kept, and a shorter retention is a smaller bill.
 *
 * Best-effort: the images are already live, so a missing cleanup policy is a billing
 * footnote, not a failed deploy.
 */
async function ensureArtifactPolicy(projectId, region, env) {
  log.step('Checking the function image cleanup policy');
  const args = ['functions:artifacts:setpolicy', '--project', projectId, '--location', region, '--force'];
  const { code, output } = await execCapture(process.execPath, [firebaseTools().binPath, ...args], env);

  if (code !== 0) {
    log.skip(`could not set the cleanup policy (exit ${code})`);
    return;
  }

  const { state, days } = cleanupPolicyOutcome(output);
  switch (state) {
    case 'missing-repo':
      return log.done('no function images yet; nothing to configure');
    case 'applied':
      return log.done(`${region}: images are now deleted after ${days} day(s)`);
    case 'unchanged':
      return log.done(`${region}: already deleting images after ${days} day(s)`);
    default:
      // Exit 0 with wording we do not recognise still means the CLI was satisfied.
      return log.done(region);
  }
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
      `\n\x1b[1mDry run.\x1b[0m Would run:\n\n  npx ng ${[...BUILD_ARGS, ...defineArgs].join(' ')}\n  npx firebase ${deployArgs.join(' ')}\n`,
    );
    return;
  }

  if (!opts.yes && !(await confirmDeployPlan({ projectId, region, targets }))) {
    console.log('\nNothing was deployed.\n');
    return;
  }

  // After the confirmation so a cancelled deploy changes nothing, but before the build so a
  // project that drifted since setup costs seconds rather than a full production build
  // followed by a failure worded in terms of the resource that could not be created.
  await ensureRequiredApis(projectId, log);
  await ensureBucketCors(projectId, log);

  log.step('Installing dependencies');
  if (opts['skip-install']) {
    log.skip('skipped (--skip-install)');
  } else {
    await exec('npm', ['install'], env);
    // Run from inside functions/ rather than with `--prefix functions`: npm treats the cwd
    // project as a dependency of the prefix target, so `--prefix` silently adds
    // `"localess": "file:.."` to the tracked functions/package.json on every deploy.
    await exec('npm', ['install'], env, resolve(ROOT, 'functions'));
    log.done('root and functions');
  }

  log.step('Building');
  if (opts['skip-build']) {
    log.skip('skipped (--skip-build)');
  } else {
    await exec(process.execPath, [ngBinPath(), ...BUILD_ARGS, ...defineArgs], env);
    log.done('dist/localess/browser');
  }

  // Before the deploy, not after: without a policy in place the CLI wants to ask about one
  // and `--non-interactive` turns that question into a non-zero exit.
  const deployingFunctions = targets.some(target => target.split(':')[0] === 'functions');
  if (deployingFunctions) await ensureArtifactPolicy(projectId, region, env);

  log.step('Deploying');
  await deployWithRetry(deployArgs, env);

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
