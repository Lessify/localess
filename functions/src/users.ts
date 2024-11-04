import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { authService } from './config';
import { canPerform } from './utils/security-utils';
import { User, UserInvite, UserPermission } from './models';
import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity';
import { findUserById } from './services';
import { onDocumentDeleted, onDocumentUpdated } from 'firebase-functions/v2/firestore';

const beforecreated = beforeUserCreated(async request => {
  const { data, eventId } = request;
  logger.info(`[Identity::beforeCreated] eventId='${eventId}' user='${JSON.stringify(data)}'`);
  if (!data || !data.email) {
    return;
  }
  const userRef = findUserById(data.uid);
  await userRef.set(
    {
      email: data.email,
      emailVerified: data.emailVerified,
      displayName: data.displayName || FieldValue.delete(),
      photoURL: data.photoURL || FieldValue.delete(),
      phoneNumber: data.phoneNumber || FieldValue.delete(),
      disabled: data.disabled,
      // Custom Claims
      // custom claims are not available at this point
      // Providers
      providers: data.providerData.map(provider => provider.providerId),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});

const beforesignedin = beforeUserSignedIn(async request => {
  const { data, eventId } = request;
  logger.info(`[Identity::beforeCreated] eventId='${eventId}' user='${JSON.stringify(data)}'`);
  if (!data) {
    return;
  }
  const userRef = findUserById(data.uid);
  const userDoc = await userRef.get();
  logger.info(`[Identity::beforeSignedIn] user='${JSON.stringify(userDoc.data())}'`);
});

const invite = onCall<UserInvite>(async request => {
  const { auth, data } = request;
  logger.info('[User::invite] data: ' + JSON.stringify(data));
  logger.info('[User::invite] auth: ' + JSON.stringify(auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const user = await authService.createUser({
    displayName: data.displayName,
    email: data.email,
    password: data.password,
    disabled: false,
  });
  await authService.setCustomUserClaims(user.uid, { role: data.role, permissions: data.permissions, lock: data.lock });
});

// TODO add use case for Deleted users from Firebase directly
const sync = onCall<never>(async request => {
  const { data, auth } = request;
  logger.info('[User::sync] data: ' + JSON.stringify(data));
  logger.info('[User::sync] auth: ' + JSON.stringify(auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const listUsers = await authService.listUsers();
  for (const userRecord of listUsers.users) {
    logger.debug('[User::sync] userRecord: ' + JSON.stringify(userRecord));
    const userRef = findUserById(userRecord.uid);
    const userSnapshot = await userRef.get();

    logger.debug(`[User::sync] userDS: id='${userSnapshot.id}' exist=${userSnapshot.exists}`);
    if (userSnapshot.exists) {
      const user = userSnapshot.data() as User;
      logger.debug('[User::sync] user: ' + JSON.stringify(user));
      if (
        userRecord.email !== user.email ||
        userRecord.emailVerified !== user.emailVerified ||
        userRecord.displayName !== user.displayName ||
        userRecord.photoURL !== user.photoURL ||
        userRecord.phoneNumber !== user.phoneNumber ||
        userRecord.disabled !== user.disabled ||
        userRecord.customClaims?.['role'] !== user.role ||
        userRecord.customClaims?.['permissions']?.join(',') !== user.permissions?.join(',') ||
        userRecord.customClaims?.['lock'] !== user.lock ||
        userRecord.providerData.map(provider => provider.providerId).join(',') !== user.providers.join(',')
      ) {
        logger.debug(`[User::sync] user: id='${userSnapshot.id}' to be updated`);
        await userRef.set(
          {
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
            displayName: userRecord.displayName || FieldValue.delete(),
            photoURL: userRecord.photoURL || FieldValue.delete(),
            phoneNumber: userRecord.phoneNumber || FieldValue.delete(),
            disabled: userRecord.disabled,
            role: userRecord.customClaims?.['role'] || FieldValue.delete(),
            permissions: userRecord.customClaims?.['permissions'] || FieldValue.delete(),
            lock: userRecord.customClaims?.['lock'] || FieldValue.delete(),
            providers: userRecord.providerData.map(provider => provider.providerId),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        logger.debug(`[User::sync] user: id='${userSnapshot.id}' no updates required`);
      }
    } else {
      logger.debug(`[User::sync] user: id='${userSnapshot.id}' to be added`);
      await userRef.set(
        {
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName || FieldValue.delete(),
          photoURL: userRecord.photoURL || FieldValue.delete(),
          phoneNumber: userRecord.phoneNumber || FieldValue.delete(),
          disabled: userRecord.disabled,
          role: userRecord.customClaims?.['role'] || FieldValue.delete(),
          permissions: userRecord.customClaims?.['permissions'] || FieldValue.delete(),
          lock: userRecord.customClaims?.['lock'] || FieldValue.delete(),
          providers: userRecord.providerData.map(provider => provider.providerId),
          createdAt: Timestamp.fromDate(new Date(userRecord.metadata.creationTime)),
          updatedAt: Timestamp.fromDate(new Date(userRecord.metadata.creationTime)),
        },
        { merge: true }
      );
    }
  }
  return true;
});

const onUpdate = onDocumentUpdated('users/{userId}', async event => {
  logger.info(`[User::onUpdate] eventId='${event.id}'`);
  logger.info(`[User::onUpdate] params='${JSON.stringify(event.params)}'`);
  const { userId } = event.params;
  // No Data
  if (!event.data) return;
  const after = event.data.after.data() as User;

  if (after.role === 'admin') {
    await authService.setCustomUserClaims(userId, { role: after.role });
  } else if (after.role === 'custom') {
    await authService.setCustomUserClaims(userId, { role: after.role, permissions: after.permissions, lock: after.lock });
  } else {
    await authService.setCustomUserClaims(userId, null);
  }
  return true;
});

const onDelete = onDocumentDeleted('users/{userId}', async event => {
  const { id, params } = event;
  logger.info(`[User::onDelete] eventId='${id}'`);
  logger.info(`[User::onDelete] params='${JSON.stringify(params)}'`);
  return authService.deleteUser(params.userId);
});

export const user = {
  beforecreated: beforecreated,
  beforesignedin: beforesignedin,
  onupdate: onUpdate,
  ondelete: onDelete,
  invite: invite,
  sync: sync,
};
