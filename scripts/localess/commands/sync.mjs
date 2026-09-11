/**
 * Regenerates the local project files from live remote state.
 *
 * The remote project is the source of truth; the local files are a cache of it. That is
 * what makes a fresh clone deployable, and it is why this is a command in its own right -
 * remote state drifts, and re-provisioning is far too big a hammer for "my region changed".
 *
 * Setup and deploy both call `syncLocalFiles`, so there is exactly one writer of local
 * project files across the whole CLI.
 */
import { parseArgs } from 'node:util';
import { copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { cli } from '../firebase-cli.mjs';
import { DEFAULT_REGION, configPath, readProjectConfig, writeProjectConfig } from '../config.mjs';
import { writeFirebaseJson, writeFunctionsEnv } from '../generate.mjs';
import { mergeProjectLabels } from '../firebase-gaps.mjs';
import { REGION_LABEL } from '../markers.mjs';
import { ROOT, createLogger, rel } from '../log.mjs';
import { UsageError } from '../usage.mjs';
import { annotateProjects, assertManaged, identifyProject } from '../projects.mjs';
import { chooseProject } from '../prompts.mjs';

export const USAGE = 'Usage: npm run localess:sync -- [--project <id>]';

/**
 * The keys no remote lookup can answer. They are edited by hand after setup, so a sync
 * preserves whatever is already on disk and only defaults them when there is no file to
 * preserve from.
 */
export const EDITABLE_KEYS = Object.freeze([
  'LOCALESS_AUTH_CUSTOM_DOMAIN',
  'LOCALESS_AUTH_PROVIDERS',
  'LOCALESS_LOGIN_MESSAGE',
  'LOCALESS_UNSPLASH_ENABLE',
]);

/**
 * Merges remote-derived values with whatever the local config already had.
 *
 * `defaulted` is non-empty only when there was no local config at all: filling a key that a
 * hand-edited file happens to omit is not worth warning about, but silently blanking a
 * login message on an existing install would be.
 */
export function resolveConfigRecord({ projectId, region, existing }) {
  const record = { LOCALESS_PROJECT_ID: projectId, LOCALESS_REGION: region };
  for (const key of EDITABLE_KEYS) record[key] = existing?.[key] ?? '';

  return { record, defaulted: existing ? [] : [...EDITABLE_KEYS] };
}

/** The gitignored per-project copy of the web SDK config. One per project, kept around. */
export function sdkConfigPath(projectId) {
  return resolve(ROOT, `src/environments/firebase-config.${projectId}.json`);
}

/**
 * The fixed path `angular.json`'s `deploy` configuration swaps in for the tracked
 * placeholder. Fixed because `fileReplacements` is static and has no CLI equivalent.
 */
export function buildSdkConfigPath() {
  return resolve(ROOT, 'src/environments/firebase-config.build.json');
}

/** The live Firestore location. Immutable, so it outranks both the label and the config. */
export async function liveRegion(projectId) {
  const databases = await cli.listFirestoreDatabases(projectId);
  const existing = databases?.find(database => database.name?.endsWith('/databases/(default)'));
  return existing?.locationId ?? null;
}

/** Rewrites the four local artifacts from remote state. */
export async function syncLocalFiles(projectId, { region, log }) {
  let existing = null;
  try {
    existing = readProjectConfig(ROOT, projectId);
  } catch {
    // No local config yet - the case this whole command exists to handle.
  }

  const { record, defaulted } = resolveConfigRecord({ projectId, region, existing });
  writeProjectConfig(ROOT, projectId, record);
  log.done(rel(configPath(ROOT, projectId)));

  log.done(`${rel(writeFunctionsEnv(ROOT, projectId, region))} (REGION=${region})`);
  log.done(rel(writeFirebaseJson(ROOT, projectId, region)));

  const apps = await cli.listWebApps(projectId);
  if (!apps || apps.length === 0) {
    throw new Error(`${projectId} has no web app. Run: npm run localess:setup -- --project ${projectId}`);
  }

  // Fetched rather than written by `apps:sdkconfig --out`, which refuses to overwrite and
  // so cannot be retried - see `readSdkConfig`. Writing it here also means no temp file to
  // strand when a run fails partway.
  const target = sdkConfigPath(projectId);
  await writeFile(target, await cli.readSdkConfig(projectId, apps[0].appId));
  log.done(`${rel(target)} (app ${apps[0].appId})`);

  // The build reads one fixed path, because angular.json's fileReplacements is static and
  // cannot be parameterised per project. Keeping the per-project file as well means
  // switching projects never refetches.
  await copyFile(target, buildSdkConfigPath());
  log.done(rel(buildSdkConfigPath()));

  if (defaulted.length > 0) {
    log.warn(`reset to defaults: ${defaulted.join(', ')}`);
    log.warn(`edit .env.${projectId} and redeploy to set them`);
  }

  return { defaulted, appId: apps[0].appId };
}

/** Corrects `localess-region` when it disagrees with the immutable Firestore location. */
export async function refreshRegionLabel(projectId, region, identity, log) {
  if (identity?.region === region) {
    log.skip(`localess-region already ${region}`);
    return;
  }

  try {
    await mergeProjectLabels(projectId, { [REGION_LABEL]: region });
    log.done(`localess-region updated to ${region}`);
  } catch (error) {
    // Best-effort: a stale display hint is not worth failing a sync over.
    log.skip(`could not update the region label (${error.message})`);
  }
}

/**
 * The picker shared by sync and deploy: choose a project from the annotated list. Neither
 * command may create a project, so `allowCreate` is false.
 */
export async function resolveProjectSelection(log) {
  log.step('Resolving Firebase project');

  const projects = await cli.listProjects();
  log.done(`found ${projects.length} accessible project${projects.length === 1 ? '' : 's'}`);

  const annotations = await annotateProjects(ROOT, projects);
  return chooseProject(projects, annotations, undefined, { allowCreate: false });
}

export async function run(argv) {
  const log = createLogger();

  let opts;
  try {
    ({ values: opts } = parseArgs({ args: argv, options: { project: { type: 'string' } }, allowPositionals: false }));
  } catch (error) {
    throw new UsageError(error.message);
  }

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

  log.step('Refreshing the region marker');
  await refreshRegionLabel(projectId, region, identity, log);

  console.log(`\n\x1b[1m\x1b[32m${projectId} is in sync.\x1b[0m\n`);
  console.log(`  npm run localess:deploy -- --project ${projectId}\n`);
}
