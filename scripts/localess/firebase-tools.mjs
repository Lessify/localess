/**
 * Locates the installed firebase-tools package.
 *
 * It is deliberately NOT a devDependency: @angular/fire declares
 * `peerOptional firebase-tools@^14.0.0`, so adding v15 to this project would
 * force every `npm install` to run with --legacy-peer-deps. Instead we use the
 * copy the user already needs for `firebase deploy`, and assert the version.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * The `auth` block in firebase.json and the provisionFirebaseApp endpoint it
 * deploys through both landed in 15.29.0.
 */
export const MIN_VERSION = '15.29.0';

function candidateRoots() {
  const roots = [join(process.cwd(), 'node_modules')];

  try {
    roots.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {
    // npm not on PATH; fall through to the well-known locations below.
  }

  if (process.platform === 'win32') {
    if (process.env.APPDATA) roots.push(join(process.env.APPDATA, 'npm', 'node_modules'));
  } else {
    roots.push('/usr/local/lib/node_modules', '/usr/lib/node_modules');
  }

  return roots.filter(Boolean);
}

/** Compares dotted numeric versions. Returns true when `version` >= `minimum`. */
function isAtLeast(version, minimum) {
  const actual = version.split('.').map(Number);
  const wanted = minimum.split('.').map(Number);
  for (let i = 0; i < wanted.length; i++) {
    const diff = (actual[i] ?? 0) - wanted[i];
    if (diff !== 0) return diff > 0;
  }
  return true;
}

let cached;

/**
 * Resolves firebase-tools once and returns handles onto it:
 *   `version`  the installed version
 *   `binPath`  the CLI entrypoint, for spawning documented commands
 *   `load`     requires a path inside the package (internals; see firebase-gaps)
 */
export function firebaseTools() {
  if (cached) return cached;

  const dir = candidateRoots()
    .map(root => join(root, 'firebase-tools'))
    .find(candidate => existsSync(join(candidate, 'package.json')));

  if (!dir) {
    throw new Error('firebase-tools not found. Install it with:\n      npm install -g firebase-tools@latest');
  }

  const { version } = require(join(dir, 'package.json'));
  if (!isAtLeast(version, MIN_VERSION)) {
    throw new Error(
      `firebase-tools ${version} is too old (need >= ${MIN_VERSION}).\n` + '      Upgrade with: npm install -g firebase-tools@latest',
    );
  }

  cached = {
    version,
    binPath: join(dir, 'lib', 'bin', 'firebase.js'),
    load: relativePath => require(join(dir, relativePath)),
  };
  return cached;
}
