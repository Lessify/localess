import {auth, firestore, https, logger} from 'firebase-functions';
import {authService, firestoreService, ROLE_ADMIN} from './config';
import {FieldValue} from 'firebase-admin/firestore';
import {SecurityUtils} from './utils/security-utils';

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
      createdOn: FieldValue.serverTimestamp(),
      updatedOn: FieldValue.serverTimestamp(),
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

interface UserInvite {
  email: string
  password: string
  role: string
}

export const userInvite = https.onCall(async (data: UserInvite, context) => {
  logger.info('[userInvite] data: ' + JSON.stringify(data));
  logger.info('[userInvite] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasRole(ROLE_ADMIN, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const adminUser = await authService.createUser({
    email: data.email,
    password: data.password,
    disabled: false
  });
  await authService.setCustomUserClaims(adminUser.uid, {role: data.role});
  return true;
});

// TODO add use case for Deleted users from Firebase directly
export const usersSync = https.onCall(async (data, context) => {
  logger.info('[usersSync] data: ' + JSON.stringify(data));
  logger.info('[usersSync] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasRole(ROLE_ADMIN, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const listUsers = await authService.listUsers();
  listUsers.users.map(async (userRecord) => {
    logger.debug('[usersSync] userRecord: ' + JSON.stringify(userRecord));
    const userRef = firestoreService.collection('users').doc(userRecord.uid);
    const userDS = await userRef.get();

    logger.debug(`[usersSync] userDS: id='${userDS.id}' exist=${userDS.exists}`);
    if (userDS.exists) {
      const user = await userDS.data()!;
      logger.debug('[usersSync] user: ' + JSON.stringify(user));
      if (
        userRecord.email !== user['email'] ||
        userRecord.displayName !== user['displayName'] ||
        userRecord.photoURL !== user['photoURL'] ||
        userRecord.disabled !== user['disabled'] ||
        userRecord.customClaims?.['role'] !== user['role']
      ) {
        logger.debug(`[usersSync] user: id='${userDS.id}' to be updated`);
        await userRef.set({
          email: userRecord.email,
          displayName: userRecord.displayName || FieldValue.delete(),
          photoURL: userRecord.photoURL || FieldValue.delete(),
          disabled: userRecord.disabled,
          role: userRecord.customClaims?.['role'],
          updatedOn: FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        logger.debug(`[usersSync] user: id='${userDS.id}' no updates required`);
      }
    } else {
      logger.debug(`[usersSync] user: id='${userDS.id}' to be added`);
      await userRef.set({
        email: userRecord.email,
        displayName: userRecord.displayName || FieldValue.delete(),
        photoURL: userRecord.photoURL || FieldValue.delete(),
        disabled: userRecord.disabled,
        role: userRecord.customClaims?.['role'],
        createdOn: FieldValue.serverTimestamp(),
        updatedOn: FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  });
  return true;
});

export const onUserUpdate = firestore.document('users/{userId}')
  .onUpdate(async (change, context) => {
    logger.info(`[User::onUpdate] id='${change.before.id}' eventId='${context.eventId}'`);
    const before = change.before.data();
    const after = change.after.data();

    // Role change from ADMIN
    const roleBefore = before['role'];
    const roleAfter = after['role'];
    if (roleBefore !== roleAfter) {
      logger.info(`[User::onUpdate::RoleChange] id='${change.before.id}' eventId='${context.eventId}' from='${roleBefore}' to='${roleAfter}'`);
      const userRecord = await authService.getUser(change.before.id)
      // check if role update already in Auth
      if (userRecord.customClaims?.['role'] !== roleAfter) {
        logger.debug(`[User::onUpdate::RoleChange] id='${change.before.id}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update required.`);
        return await authService.setCustomUserClaims(change.before.id, {role: roleAfter});
      } else {
        logger.debug(`[User::onUpdate::RoleChange] id='${change.before.id}' auth='${userRecord.customClaims?.['role']}' db='${roleAfter}', auth update not required.`);
      }
      return true
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
    logger.info(`[User::onDelete] id='${snapshot.id}' eventId='${context.eventId}'`);
    return authService.deleteUser(snapshot.id);
  });
