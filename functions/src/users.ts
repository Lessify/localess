import {auth,} from 'firebase-functions';
import {firestoreService} from './config';

export const onUserCreate = auth.user().onCreate(async (user, context) => {
  if (!user.email) {
    return null;
  }
  const userRef = firestoreService.collection('users').doc(user.uid)

  userRef.set({}, {merge: true})


  return null;
});

export const onUserDelete = auth.user().onDelete(async (user, context) => {
});
