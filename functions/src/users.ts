import {auth, firestore, logger,} from 'firebase-functions';
import {authService, firestoreService} from './config';
import {FieldValue} from 'firebase-admin/firestore';

export const onUserCreate = auth.user()
  .onCreate(async (user, context) => {
    if (!user.email) {
      return null;
    }
    const userRef = firestoreService.collection('users').doc(user.uid)

    const {email, displayName, photoURL, disabled} = user;
    await userRef.set({
      email,
      displayName,
      photoURL,
      disabled,
      createdOn: FieldValue.serverTimestamp(),
      updatedOn: FieldValue.serverTimestamp()
    }, {merge: true})

    return true;
  });

export const onUserDelete = auth.user().onDelete(async (user, context) => {
});

export const onUserUpdate = firestore.document('users/{userId}')
  .onUpdate(async (change, context) => {
    logger.info(`[User::onUpdate] id='${change.before.id}' eventId='${context.eventId}'`);
    const before = change.before.data();
    const after = change.after.data();

    // Role change
    const roleBefore = before['role'];
    const roleAfter = after['role'];
    if (roleBefore !== roleAfter) {
      logger.info(`[User::onUpdate::RoleChange] id='${change.before.id}' eventId='${context.eventId}' from='${roleBefore}' to='${roleAfter}'`);
      await authService.setCustomUserClaims(change.before.id, {role: roleAfter});
    }
    return true;
  });
