/**
 * Creating the first admin user from the CLI.
 *
 * This calls the deployed `setup` callable rather than creating the account directly. That
 * callable does three things - creates the user, grants it the `role: admin` claim, and
 * seeds the first space - and reimplementing them here would produce a second definition of
 * "what a first admin needs" that drifts from `functions/src/setup.ts`. Driving the same
 * endpoint the web wizard drives keeps there being exactly one.
 *
 * Doing it from the CLI matters beyond convenience. `setup` cannot require authentication,
 * because no account exists for it to authenticate against, and its only guard is whether an
 * admin has already been created. Until one has, anyone who knows the project id can claim
 * the account. Creating it in the same session as the deploy closes that window; leaving it
 * for whenever somebody remembers to open `/setup` does not.
 */
import { DEFAULT_ADMIN_NAME, askAdminCredentials, missingAdminCredentials } from './prompts.mjs';

/** The password is read from here, never from a flag - argv is world-readable. */
export const PASSWORD_ENV = 'LOCALESS_ADMIN_PASSWORD';

/** The deployed `setup` callable's URL, or `null` when it is not deployed. */
export function setupFunctionUri(deployedFunctions) {
  return (deployedFunctions ?? []).find(fn => fn.id === 'setup')?.uri ?? null;
}

/**
 * Turns a callable's error response into something worth reading.
 *
 * The Firebase callable protocol puts a machine-readable status in the body, so the two
 * cases with a real explanation get one and everything else falls back to the raw message.
 */
export function describeSetupFailure(status, body) {
  const error = body?.error ?? {};
  const code = error.status ?? '';

  if (code === 'ALREADY_EXISTS' || /already.exists/i.test(error.message ?? '')) {
    return 'the setup has already been completed on this project, so no further admin can be created this way';
  }
  if (status === 403 || code === 'PERMISSION_DENIED') {
    return 'the setup function rejected the call - its allUsers invoker binding may still be propagating';
  }
  return error.message ? `${error.message} (HTTP ${status})` : `HTTP ${status}`;
}

/** Whether a failed attempt is worth repeating. */
export function isTransientSetupFailure(status, body) {
  const code = body?.error?.status ?? '';
  // A just-added Cloud Run IAM binding takes seconds to become effective, so the very
  // repair that makes this call possible can also make the first attempt fail.
  return status === 403 || code === 'PERMISSION_DENIED' || status >= 500;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls the `setup` callable, retrying while a freshly granted invoker binding propagates.
 *
 * Not idempotent, and deliberately not retried on anything else: the callable creates an
 * account, and repeating a call that may have succeeded is the one mistake here with a
 * consequence that cannot be undone from the CLI.
 */
export async function createFirstAdmin(uri, credentials, { attempts = 6, delayMs = 5000, fetchImpl = fetch } = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetchImpl(uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: credentials }),
    });

    if (response.ok) return;

    let body = null;
    try {
      body = await response.json();
    } catch {
      // A non-JSON body means the request never reached the function - Cloud Run's own 403
      // page, for instance. `describeSetupFailure` handles the absent body.
    }

    if (attempt === attempts || !isTransientSetupFailure(response.status, body)) {
      throw new Error(describeSetupFailure(response.status, body));
    }
    await sleep(delayMs);
  }
}

/**
 * Collects credentials and creates the first admin.
 *
 * Prompts for whatever was not supplied, and refuses to prompt when there is no terminal to
 * prompt into - a scripted run must fail with the name of the variable it is missing rather
 * than hang forever on a masked input nobody can see.
 */
export async function ensureFirstAdmin(deployedFunctions, supplied, log, { interactive = process.stdin.isTTY } = {}) {
  log.step('Creating the first admin user');

  const uri = setupFunctionUri(deployedFunctions);
  if (!uri) {
    log.warn('the setup function is not deployed yet; deploy first, then re-run with --fix');
    return false;
  }

  const absent = missingAdminCredentials(supplied);
  if (absent.length > 0 && !interactive) {
    log.warn(`no terminal to ask for the admin ${absent.join(' and ')}`);
    log.warn(`pass --admin-email and set ${PASSWORD_ENV}, or re-run interactively`);
    return false;
  }

  // The display name is the one credential with a sensible default, so a scripted run does
  // not have to supply it - but it must be filled in here, or the prompt for it would hang
  // a run that has no terminal.
  const credentials = await askAdminCredentials(
    interactive ? supplied : { ...supplied, displayName: supplied.displayName ?? DEFAULT_ADMIN_NAME },
  );

  try {
    await createFirstAdmin(uri, credentials);
  } catch (error) {
    log.warn(`could not create the admin user: ${error.message}`);
    return false;
  }

  log.done(`${credentials.email} created with the admin role`);
  return true;
}
