import {auth, firestore, https, logger,} from 'firebase-functions';
import {authService, firestoreService, ROLE_ADMIN} from './config';
import {FieldValue} from 'firebase-admin/firestore';
import {SecurityUtils} from './utils/security-utils';

export const onAuthUserCreate = auth.user()
  .onCreate((user, context) => {
    logger.info(`[AuthUser::onCreate] id='${user.uid}' eventId='${context.eventId}'`);
    if (!user.email) {
      return null;
    }
    const userRef = firestoreService.collection('users').doc(user.uid)

    const {email, displayName, photoURL, disabled} = user;
    return userRef.set({
      email,
      displayName,
      photoURL,
      disabled,
      createdOn: FieldValue.serverTimestamp(),
      updatedOn: FieldValue.serverTimestamp()
    }, {merge: true})
  });

export const onAuthUserDelete = auth.user()
  .onDelete(async (user, context) => {
    logger.info(`[AuthUser::onDelete] id='${user.uid}' eventId='${context.eventId}'`);
    const userRef = firestoreService.collection('users').doc(user.uid);
    const userDS = await userRef.get()
    if (userDS.exists) {
      await userRef.delete()
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
    emailVerified: true,
    disabled: false
  });
  await authService.setCustomUserClaims(adminUser.uid, {role: data.role})
  return true;
})

export const onUserUpdate = firestore.document('users/{userId}')
  .onUpdate((change, context) => {
    logger.info(`[User::onUpdate] id='${change.before.id}' eventId='${context.eventId}'`);
    const before = change.before.data();
    const after = change.after.data();

    // Role change from ADMIN
    const roleBefore = before['role'];
    const roleAfter = after['role'];
    if (roleBefore !== roleAfter) {
      logger.info(`[User::onUpdate::RoleChange] id='${change.before.id}' eventId='${context.eventId}' from='${roleBefore}' to='${roleAfter}'`);
      return authService.setCustomUserClaims(change.before.id, {role: roleAfter});
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
    return authService.deleteUser(snapshot.id)
  })
