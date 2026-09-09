/**
 * What a deploy pushes, and the argv that pushes it. Pure, so the decisions are testable
 * without a Firebase project.
 */

/**
 * The default target set, matching cloudbuild.yaml so a local deploy and a CI deploy do the
 * same thing. `auth` is included because setup no longer provisions Identity Platform -
 * setup enables services, deploy applies configuration. `remoteconfig` is excluded: it
 * would overwrite console-side edits on every deploy.
 */
export const DEFAULT_TARGETS = Object.freeze(['hosting', 'functions', 'storage', 'firestore', 'auth']);

/** Everything `firebase deploy --only` accepts here, so a typo fails locally and fast. */
export const KNOWN_TARGETS = Object.freeze([...DEFAULT_TARGETS, 'remoteconfig', 'extensions', 'database']);

/**
 * Normalises `--only`. Targets may be scoped (`functions:publicv1`, `hosting:mysite`), so
 * only the part before the colon is checked against the known set.
 */
export function parseTargets(only) {
  if (only === undefined) return [...DEFAULT_TARGETS];

  const targets = only
    .split(',')
    .map(target => target.trim())
    .filter(Boolean);

  if (targets.length === 0) throw new Error('--only was given with no targets.');

  const unknown = targets.filter(target => !KNOWN_TARGETS.includes(target.split(':')[0]));
  if (unknown.length > 0) {
    const plural = unknown.length > 1 ? 's' : '';
    throw new Error(`Unknown deploy target${plural}: ${unknown.join(', ')}. Known targets: ${KNOWN_TARGETS.join(', ')}.`);
  }

  return targets;
}

/** The `firebase deploy` argv. Always against the generated per-project config. */
export function buildDeployArgs({ configPath, projectId, targets }) {
  return ['deploy', '--config', configPath, '--project', projectId, '--only', targets.join(','), '--non-interactive'];
}
