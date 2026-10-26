/**
 * Lets the functions sign Storage URLs.
 *
 * Firebase Hosting cuts a rewritten function response off at 32 MiB, so the asset API
 * redirects anything larger to a short-lived signed Storage URL (functions/src/utils/
 * stream-object.ts). The functions have no key file, so they sign through the IAM
 * Credentials `signBlob` API as their own runtime service account - which needs
 * `iam.serviceAccounts.signBlob` *on itself*. Nothing grants that by default, and without it
 * every large asset download fails.
 *
 * Applied after each functions deploy and checked by `localess:check`, like the invoker
 * bindings: the account only exists once functions have been deployed.
 */
import { addServiceAccountBinding, getProjectNumber, getServiceAccountIamPolicy } from './firebase-gaps.mjs';

/** The narrowest predefined role carrying `iam.serviceAccounts.signBlob`. */
export const SIGNER_ROLE = 'roles/iam.serviceAccountTokenCreator';

/** Gen-2 functions run as the default compute service account unless told otherwise. */
export function runtimeServiceAccount(projectNumber) {
  return `${projectNumber}-compute@developer.gserviceaccount.com`;
}

/** Whether `policy` lets `email` sign as itself. */
export function canSign(policy, email) {
  return (policy?.bindings ?? []).some(
    binding => binding.role === SIGNER_ROLE && (binding.members ?? []).includes(`serviceAccount:${email}`),
  );
}

/**
 * The signing state: `{ serviceAccount, granted }`, where `granted` is `true`, `false`, or
 * `null` when it could not be read. `serviceAccount` is `null` when the project number is
 * unreadable, and `granted` is `undefined` when the account does not exist yet.
 */
export async function readUrlSigning(projectId) {
  const projectNumber = await getProjectNumber(projectId);
  if (!projectNumber) return { serviceAccount: null, granted: null };

  const serviceAccount = runtimeServiceAccount(projectNumber);
  const policy = await getServiceAccountIamPolicy(projectId, serviceAccount);
  if (policy === undefined) return { serviceAccount, granted: undefined };
  if (policy === null) return { serviceAccount, granted: null };
  return { serviceAccount, granted: canSign(policy, serviceAccount) };
}

/**
 * Grants the runtime service account the right to sign as itself, when it lacks it.
 *
 * Best-effort, like the bucket CORS: it needs `iam.serviceAccounts.setIamPolicy`, and an
 * operator without it should still get a deploy. Only large asset downloads depend on it,
 * and `localess:check` keeps reporting the gap until it is closed.
 */
export async function ensureUrlSigning(projectId, log) {
  log.step('Checking that the functions can sign Storage URLs');

  const { serviceAccount, granted } = await readUrlSigning(projectId);
  if (granted === true) {
    log.skip(`${serviceAccount} already holds ${SIGNER_ROLE} on itself`);
    return;
  }
  if (granted === undefined) {
    log.skip(`${serviceAccount} does not exist yet; it is created by the first functions deploy`);
    return;
  }
  if (granted === null) {
    log.warn(`could not read the IAM policy of ${serviceAccount ?? 'the runtime service account'}`);
    return;
  }

  try {
    await addServiceAccountBinding(projectId, serviceAccount, SIGNER_ROLE, `serviceAccount:${serviceAccount}`);
    log.done(`${serviceAccount} can now sign Storage URLs`);
  } catch (error) {
    log.warn(`could not grant ${SIGNER_ROLE} on ${serviceAccount} (${error.message})`);
    log.warn('assets larger than 31 MiB will fail to download until it is granted');
  }
}
