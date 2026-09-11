/**
 * Creating the first admin user from the CLI.
 *
 * This used to call the deployed `setup` callable. That callable no longer exists: it could
 * not require authentication - no account exists yet to authenticate against - and its only
 * guard was whether an admin had already been created, so on any freshly deployed project
 * anyone who knew the project id could claim the administrator account. Deleting the
 * endpoint is strictly safer than guarding it, and this is what replaced it.
 *
 * Three calls, in order: create the account, grant it the admin role, write its documents.
 * The last is a single Firestore commit, so the user document and the seeded space arrive
 * together or not at all.
 *
 * Deliberately independent of the deployed backend. A bootstrap tool that required the
 * system it bootstraps to already be working would fail in exactly the situation
 * `npm run localess:check` exists to diagnose.
 */
import { commitFirestoreWrites, createIdentityAccount, setIdentityCustomClaims } from './firebase-gaps.mjs';
import { autoId, toFirestoreFields } from './firestore-rest.mjs';
import { DEFAULT_ADMIN_NAME, askAdminCredentials, missingAdminCredentials } from './prompts.mjs';

/** The password is read from here, never from a flag - argv is world-readable. */
export const PASSWORD_ENV = 'LOCALESS_ADMIN_PASSWORD';

/** The custom claim the permission system reads. See docs/frontend-permissions.md. */
export const ADMIN_ROLE = 'admin';

/** Mirrors DEFAULT_LOCALE in functions/src/models/space.model.ts. Pinned by a test. */
export const DEFAULT_LOCALE = Object.freeze({ id: 'en', name: 'English' });

/** Written by the server, not by this process, so both documents use REQUEST_TIME. */
const SERVER_TIMESTAMP_FIELDS = Object.freeze(['createdAt', 'updatedAt']);

const serverTimestamps = () => SERVER_TIMESTAMP_FIELDS.map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' }));

/**
 * The `users/{uid}` document.
 *
 * Mirrors what `beforeUserCreated` in functions/src/users.ts writes, because that blocking
 * function does NOT fire for accounts created through the Identity Platform admin API - so
 * nothing else will write this document. That is why a first admin has never appeared in
 * Admin -> Users until somebody ran the `user.sync` callable.
 *
 * `role` is the one field the blocking function cannot write: custom claims do not exist yet
 * at the point it runs, as its own comment says. Here they do.
 *
 * `photoURL` and `phoneNumber` are omitted rather than written. The blocking function stores
 * `FieldValue.delete()` for them, which means absent, and absent is what omitting them gives.
 */
export function adminUserFields({ email, displayName }) {
  return {
    email,
    emailVerified: true,
    displayName,
    disabled: false,
    providers: ['password'],
    role: ADMIN_ROLE,
  };
}

/** The starter space, reproducing exactly what the `setup` callable used to seed. */
export function helloWorldSpaceFields() {
  return {
    name: 'Hello World',
    locales: [DEFAULT_LOCALE],
    localeFallback: DEFAULT_LOCALE,
  };
}

/** Both documents as one atomic Firestore commit payload. */
export function buildBootstrapWrites({ projectId, localId, spaceId, email, displayName }) {
  const documents = `projects/${projectId}/databases/(default)/documents`;
  return [
    {
      update: { name: `${documents}/users/${localId}`, fields: toFirestoreFields(adminUserFields({ email, displayName })) },
      updateTransforms: serverTimestamps(),
    },
    {
      update: { name: `${documents}/spaces/${spaceId}`, fields: toFirestoreFields(helloWorldSpaceFields()) },
      updateTransforms: serverTimestamps(),
    },
  ];
}

/**
 * Turns an Identity Platform error into something worth reading.
 *
 * The API puts a machine-readable token in `error.message`, so the three cases an operator
 * can actually act on get an explanation and everything else keeps the raw text.
 */
export function describeAccountFailure(status, body) {
  const message = body?.error?.message ?? '';

  if (/EMAIL_EXISTS/.test(message)) return 'an account with that email address already exists';
  if (/INVALID_EMAIL/.test(message)) return 'the email address was rejected as invalid';
  // The project may carry a stricter Identity Platform password policy than the six
  // characters checked locally, so the server's own wording is the useful part.
  if (/PASSWORD/.test(message)) return `the password was rejected: ${message}`;

  return message ? `${message} (HTTP ${status})` : `HTTP ${status}`;
}

/**
 * Creates the account, grants it the admin role and writes its documents.
 *
 * Nothing here is retried. None of these failures are transient, and the account creation is
 * the one call in this CLI whose repetition cannot be undone.
 *
 * The steps are not atomic with each other - they are three different Google APIs - so a
 * failure after the account exists says so explicitly. That state is recoverable: the
 * account can sign in, and `user.sync` backfills the document, minus `role`.
 */
export async function createFirstAdmin(projectId, credentials, deps = {}) {
  const {
    createAccount = createIdentityAccount,
    setClaims = setIdentityCustomClaims,
    commit = commitFirestoreWrites,
    newId = autoId,
  } = deps;

  const { email, password, displayName } = credentials;

  let localId;
  try {
    localId = await createAccount(projectId, { email, password, displayName });
  } catch (error) {
    throw new Error(describeAccountFailure(error.status, error.body));
  }

  try {
    await setClaims(projectId, localId, { role: ADMIN_ROLE });
    await commit(projectId, buildBootstrapWrites({ projectId, localId, spaceId: newId(), email, displayName }));
  } catch (error) {
    throw new Error(
      `${email} was created but the setup could not be finished (${describeAccountFailure(error.status, error.body)}). ` +
        'The account exists; re-check the project to see what is still missing.',
    );
  }
}

/**
 * Collects credentials and creates the first admin.
 *
 * Prompts for whatever was not supplied, and refuses to prompt when there is no terminal to
 * prompt into - a scripted run must fail with the name of the variable it is missing rather
 * than hang forever on a masked input nobody can see.
 */
export async function ensureFirstAdmin(projectId, supplied, log, { interactive = process.stdin.isTTY } = {}) {
  log.step('Creating the first admin user');

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
    await createFirstAdmin(projectId, credentials);
  } catch (error) {
    log.warn(`could not create the admin user: ${error.message}`);
    return false;
  }

  log.done(`${credentials.email} created with the admin role`);
  return true;
}
