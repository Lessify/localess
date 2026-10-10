import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreService, ROLE_ADMIN } from './config';
import { hasRole } from './utils/user-auth-utils';
import { authUid } from './utils/log-auth';
import { hashMigrationToken, MIGRATION_CONFIG_PATH, newMigrationToken } from './utils/migration-token';

/** Admin → Settings → Migration: a new token replaces the old one; it is returned once and only its hash is kept. */
const generate = onCall<void, Promise<{ token: string; createdAt: string }>>(async request => {
  logger.info('[MigrationToken::generate] auth uid: ' + authUid(request.auth));
  if (!hasRole(ROLE_ADMIN, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const token = newMigrationToken();
  const createdAt = new Date();
  await firestoreService.doc(MIGRATION_CONFIG_PATH).set({ tokenHash: hashMigrationToken(token), createdAt: FieldValue.serverTimestamp() });
  return { token, createdAt: createdAt.toISOString() };
});

/** Turns the migration API off (it answers 404 again). */
const revoke = onCall<void, Promise<void>>(async request => {
  logger.info('[MigrationToken::revoke] auth uid: ' + authUid(request.auth));
  if (!hasRole(ROLE_ADMIN, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  await firestoreService.doc(MIGRATION_CONFIG_PATH).delete();
});

export const migrationtoken = { generate, revoke };
