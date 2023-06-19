import {auth, firestore, https, logger} from 'firebase-functions';
import {authService, firestoreService} from './config';
import {FieldValue} from 'firebase-admin/firestore';
import {SecurityUtils} from './utils/security-utils';
import {UserInvite, UserPermission} from './models/user.model';

export const onAuthUserCreate = auth.user()
  .onCreate((user, context) => {
    logger.info(`[AuthUser::onCreate] id='${user.uid}' eventId='${context.eventId}'`);
    logger.info(`[AuthUser::onCreate] user='${JSON.stringify(user)}'`);
    if (!user.email) {
      return null;
    }
    const userRef = firestoreService.collection('users').doc(user.uid);

    return userRef.set({
      email: user.email,
      displayName: user.displayName || FieldValue.delete(),
      photoURL: user.photoURL || FieldValue.delete(),
      disabled: user.disabled,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });

export const onAuthUserDelete = auth.user()
  .onDelete(async (user, context) => {
    logger.info(`[AuthUser::onDelete] id='${user.uid}' eventId='${context.eventId}'`);
    const userRef = firestoreService.collection('users').doc(user.uid);
    const userDS = await userRef.get();
    if (userDS.exists) {
      await userRef.delete();
    }
    return true;
  });

export const userInvite = https.onCall(async (data: UserInvite, context) => {
  logger.info('[userInvite] data: ' + JSON.stringify(data));
  logger.info('[userInvite] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.USER_MANAGEMENT, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const adminUser = await authService.createUser({
    displayName: data.displayName,
    email: data.email,
    password: data.password,
    disabled: false,
  });
  await authService.setCustomUserClaims(adminUser.uid, {role: data.role, permissions: data.permissions});
  return true;
});

// TODO add use case for Deleted users from Firebase directly
export const usersSync = https.onCall(async (data, context) => {
  logger.info('[usersSync] data: ' + JSON.stringify(data));
  logger.info('[usersSync] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.USER_MANAGEMENT, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const listUsers = await authService.listUsers();
  listUsers.users.map(async (userRecord) => {
    logger.debug('[usersSync] userRecord: ' + JSON.stringify(userRecord));
    const userRef = firestoreService.collection('users').doc(userRecord.uid);
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

export const onUserUpdate = firestore.document('users/{userId}')
  .onUpdate(async (change, context) => {
    logger.info(`[User::onUpdate] eventId='${context.eventId}' id='${change.before.id}'`);
    const before = change.before.data();
    const after = change.after.data();

    // Role change from ADMIN
    const roleBefore = before['role'];
    const roleAfter = after['role'];
    // Role change from ADMIN
    const permissionsBefore = before['permissions'];
    const permissionsAfter = after['permissions'];

    if (roleBefore !== roleAfter || permissionsBefore !== permissionsAfter) {
      logger.info(`[User::onUpdate::RoleChange] eventId='${context.eventId}' id='${change.before.id}' from='${roleBefore}' to='${roleAfter}'`);
      logger.info(`[User::onUpdate::PermissionsChange] eventId='${context.eventId}' id='${change.before.id}' from='${permissionsBefore}' to='${permissionsAfter}'`);
      const userRecord = await authService.getUser(change.before.id);
      // check if role update already in Auth
      if (userRecord.customClaims?.['role'] !== roleAfter || userRecord.customClaims?.['permissions'] !== permissionsAfter) {
        logger.debug(`[User::onUpdate::RoleChange] eventId='${context.eventId}' id='${change.before.id}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update required.`);
        logger.debug(`[User::onUpdate::PermissionsChange] eventId='${context.eventId}' id='${change.before.id}' auth='${userRecord.customClaims?.['permissions']}' db='${permissionsAfter}', auth update required.`);
        return await authService.setCustomUserClaims(change.before.id, {role: roleAfter, permissions: permissionsAfter});
      } else {
        logger.debug(`[User::onUpdate::RoleChange] eventId='${context.eventId}' id='${change.before.id}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update not required.`);
        logger.debug(`[User::onUpdate::PermissionsChange] eventId='${context.eventId}' id='${change.before.id}' auth='${userRecord.customClaims?.['permissions']}' db='${permissionsAfter}', auth update not required.`);
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

export const onUserDelete = firestore.document('users/{userId}')
  .onDelete((snapshot, context) => {
    logger.info(`[User::onDelete] eventId='${context.eventId}' id='${snapshot.id}'`);
    return authService.deleteUser(snapshot.id);
  });
