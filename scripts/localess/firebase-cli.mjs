/**
 * Thin wrapper around the documented Firebase CLI surface.
 *
 * Everything in here maps 1:1 onto a public `firebase <command>`. Anything the
 * CLI has no command for lives in `firebase-gaps.mjs` instead.
 */
import { spawn } from 'node:child_process';

import { firebaseTools } from './firebase-tools.mjs';

/**
 * STATUS_STACK_BUFFER_OVERRUN (0xC0000409). The Firebase CLI intermittently
 * aborts on Windows with `Assertion failed: !(handle->flags &
 * UV_HANDLE_CLOSING)` while tearing down its event loop — after the command
 * has already done its work and printed its result. Because every command this
 * module exposes is idempotent, retrying is safe and is the only way to make
 * the script reliable on Windows.
 */
const WINDOWS_TEARDOWN_ABORT = 3221226505;

function spawnOnce(args, { capture }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [firebaseTools().binPath, ...args], {
      // stdin is deliberately not inherited: this script owns all prompting.
      stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'],
      env: process.env,
    });

    let stdout = '';
    child.stdout?.on('data', chunk => (stdout += chunk));
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      const error = new Error(`firebase ${args.join(' ')} exited with code ${code}`);
      error.exitCode = code;
      reject(error);
    });
  });
}

/**
 * Runs the Firebase CLI. Output is streamed to the terminal unless `capture`
 * is set, in which case stdout is returned instead (used with `--json`).
 */
async function run(args, { capture = false, attempts = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await spawnOnce(args, { capture });
    } catch (error) {
      if (error.exitCode !== WINDOWS_TEARDOWN_ABORT || attempt === attempts) throw error;
    }
  }
}

/** Runs a CLI command with `--json` and returns the parsed `result`. */
async function runJson(args) {
  const stdout = await run([...args, '--json'], { capture: true });
  const parsed = JSON.parse(stdout);
  if (parsed.status !== 'success') {
    throw new Error(parsed.error ?? `firebase ${args.join(' ')} failed`);
  }
  return parsed.result;
}

export const cli = {
  /** Logged-in accounts, or an empty list when nobody is authenticated. */
  async loggedInAccounts() {
    const result = await runJson(['login:list']);
    return (result ?? []).map(account => account.user?.email).filter(Boolean);
  },

  /**
   * Every project the logged-in account can see. Shape varies by CLI version - some
   * return the array directly, some wrap it - so normalise to an array here.
   */
  async listProjects() {
    const result = await runJson(['projects:list']);
    if (Array.isArray(result)) return result;
    return result?.results ?? result?.projects ?? [];
  },

  createProject: (projectId, displayName) => run(['projects:create', projectId, '--display-name', displayName]),

  /**
   * Selects the active project for this directory. Note it does NOT write
   * `.firebaserc` — the selection is stored per-directory by the CLI — but it
   * does exit non-zero for an unknown or inaccessible project, which is why
   * `resolveProject` uses it to validate.
   */
  useProject: projectId => run(['use', projectId]),

  listWebApps: projectId => runJson(['apps:list', 'WEB', '--project', projectId]),

  createWebApp: (projectId, displayName) => runJson(['apps:create', 'WEB', displayName, '--project', projectId]),

  /** Writes the web SDK config straight to `outPath`. */
  writeSdkConfig: (projectId, appId, outPath) => run(['apps:sdkconfig', 'WEB', appId, '--project', projectId, '--out', outPath]),

  listFirestoreDatabases: projectId => runJson(['firestore:databases:list', '--project', projectId]),

  createFirestoreDatabase: (projectId, databaseId, location) =>
    run(['firestore:databases:create', databaseId, '--project', projectId, '--location', location]),

  /** Unlike the other list commands, this one wraps its array in `{ sites }`. */
  async listHostingSites(projectId) {
    const result = await runJson(['hosting:sites:list', '--project', projectId]);
    return result?.sites ?? [];
  },

  createHostingSite: (projectId, siteId) => run(['hosting:sites:create', siteId, '--project', projectId]),

  /** Provisions Identity Platform + the providers declared in `firebase.json`. */
};
