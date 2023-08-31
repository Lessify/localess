import {auth, logger} from 'firebase-functions';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {onDocumentDeleted, onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import {authService} from './config';
import {canPerform} from './utils/security-utils';
import {User, UserInvite, UserPermission} from './models/user.model';
import {findUserById} from './services/user.service';

const onAuthUserCreate = auth.user()
  .onCreate((user, context) => {
    logger.info(`[AuthUser::onCreate] id='${user.uid}' eventId='${context.eventId}'`);
    logger.info(`[AuthUser::onCreate] user='${JSON.stringify(user)}'`);
    if (!user.email) {
      return null;
    }
    const userRef = findUserById(user.uid);

    return userRef.set({
      email: user.email,
      displayName: user.displayName || FieldValue.delete(),
      photoURL: user.photoURL || FieldValue.delete(),
      disabled: user.disabled,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });

// const onAuthUserDelete = auth.user()
//   .onDelete(async (user, context) => {
//     logger.info(`[AuthUser::onDelete] id='${user.uid}' eventId='${context.eventId}'`);
//     const userRef = findUserById(user.uid);
//     const userDS = await userRef.get();
//     if (userDS.exists) {
//       await userRef.delete();
//     }
//     return true;
//   });

const userInvite = onCall<UserInvite>(async (request) => {
  logger.info('[userInvite] data: ' + JSON.stringify(request.data));
  logger.info('[userInvite] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const adminUser = await authService.createUser({
    displayName: request.data.displayName,
    email: request.data.email,
    password: request.data.password,
    disabled: false,
  });
  await authService.setCustomUserClaims(adminUser.uid, {role: request.data.role, permissions: request.data.permissions});
  return true;
});

// TODO add use case for Deleted users from Firebase directly
const usersSync = onCall<never>(async (request) => {
  logger.info('[usersSync] data: ' + JSON.stringify(request.data));
  logger.info('[usersSync] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const listUsers = await authService.listUsers();
  listUsers.users.map(async (userRecord) => {
    logger.debug('[usersSync] userRecord: ' + JSON.stringify(userRecord));
    const userRef = findUserById(userRecord.uid);
    const userSnapshot = await userRef.get();

    logger.debug(`[usersSync] userDS: id='${userSnapshot.id}' exist=${userSnapshot.exists}`);
    if (userSnapshot.exists) {
      const user = await userSnapshot.data()!;
      logger.debug('[usersSync] user: ' + JSON.stringify(user));
      if (
        userRecord.email !== user['email'] ||
        userRecord.displayName !== user['displayName'] ||
        userRecord.photoURL !== user['photoURL'] ||
        userRecord.disabled !== user['disabled'] ||
        userRecord.customClaims?.['role'] !== user['role'] ||
        userRecord.customClaims?.['permissions'] !== user['permissions']
      ) {
        logger.debug(`[usersSync] user: id='${userSnapshot.id}' to be updated`);
        await userRef.set({
          email: userRecord.email,
          displayName: userRecord.displayName || FieldValue.delete(),
          photoURL: userRecord.photoURL || FieldValue.delete(),
          disabled: userRecord.disabled,
          role: userRecord.customClaims?.['role'] || FieldValue.delete(),
          permissions: userRecord.customClaims?.['permissions'] || FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        logger.debug(`[usersSync] user: id='${userSnapshot.id}' no updates required`);
      }
    } else {
      logger.debug(`[usersSync] user: id='${userSnapshot.id}' to be added`);
      await userRef.set({
        email: userRecord.email,
        displayName: userRecord.displayName || FieldValue.delete(),
        photoURL: userRecord.photoURL || FieldValue.delete(),
        disabled: userRecord.disabled,
        role: userRecord.customClaims?.['role'],
        permissions: userRecord.customClaims?.['permissions'],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  });
  return true;
});

const onUserUpdate = onDocumentUpdated('users/{userId}', async (event) => {
  logger.info(`[User::onUpdate] eventId='${event.id}'`);
  logger.info(`[User::onUpdate] params='${JSON.stringify(event.params)}'`);
  const {userId} = event.params;
  // No Data
  if (!event.data) return;
  const before = event.data.before.data() as User;
  const after = event.data.after.data() as User;
  // Role change from ADMIN
  const roleBefore = before.role;
  const roleAfter = after.role;
  // Role change from ADMIN
  const permissionsBefore = before.permissions;
  const permissionsAfter = after.permissions;

  if (roleBefore !== roleAfter || permissionsBefore !== permissionsAfter) {
    logger.info(`[User::onUpdate::RoleChange] eventId='${event.id}' id='${userId}' from='${roleBefore}' to='${roleAfter}'`);
    logger.info(`[User::onUpdate::PermissionsChange] eventId='${event.id}' id='${userId}' from='${permissionsBefore}' to='${permissionsAfter}'`);
    const userRecord = await authService.getUser(userId);
    // check if role update already in Auth
    if (userRecord.customClaims?.['role'] !== roleAfter || userRecord.customClaims?.['permissions'] !== permissionsAfter) {
      logger.debug(`[User::onUpdate::RoleChange] eventId='${event.id}' id='${userId}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update required.`);
      logger.debug(`[User::onUpdate::PermissionsChange] eventId='${event.id}' id='${userId}' auth='${userRecord.customClaims?.['permissions']}' db='${permissionsAfter}', auth update required.`);
      return await authService.setCustomUserClaims(userId, {role: roleAfter, permissions: permissionsAfter});
    } else {
      logger.debug(`[User::onUpdate::RoleChange] eventId='${event.id}' id='${userId}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update not required.`);
      logger.debug(`[User::onUpdate::PermissionsChange] eventId='${event.id}' id='${userId}' auth='${userRecord.customClaims?.['permissions']}' db='${permissionsAfter}', auth update not required.`);
    }
    return true;
  }

  // DisplayName change from Me
  // const displayNameBefore = before['displayName']
  // const displayNameAfter = after['displayName']
  // if (displayNameBefore !== displayNameAfter) {
  //   logger.info(`[User::onUpdate::DisplayNameChange] id='${change.before.id}' eventId='${context.eventId}' from='${displayNameBefore}' to='${displayNameAfter}'`);
  //   return authService.updateUser(change.before.id, {displayName: displayNameAfter})
  // }

  return true;
});

const onUserDelete = onDocumentDeleted('users/{userId}', async (event) => {
  logger.info(`[User::onDelete] eventId='${event.id}'`);
  logger.info(`[User::onDelete] params='${JSON.stringify(event.params)}'`);
  const {userId} = event.params;
  return authService.deleteUser(userId);
});

export const user = {
  onauthcreate: onAuthUserCreate,
  onupdate: onUserUpdate,
  ondelete: onUserDelete,
  invite: userInvite,
  sync: usersSync,
};
