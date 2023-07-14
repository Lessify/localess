import {https, logger} from 'firebase-functions';
import {FieldValue} from 'firebase-admin/firestore';
import {authService, firestoreService} from './config';

interface Setup {
  displayName?: string | null
  email: string
  password: string
}

export const setup = https.onCall(async (data: Setup, context) => {
  logger.info('[setup] data: ' + JSON.stringify(data));
  logger.info('[setup] context.auth: ' + JSON.stringify(context.auth));

  const setupRef = firestoreService.doc('configs/setup');
  const setupSnapshot = await setupRef.get();
  if (setupSnapshot.exists) {
    logger.info('[setup] The configuration already exists.');
    throw new https.HttpsError('already-exists', 'The configuration already exists.');
  } else {
    const adminUser = await authService.createUser({
      displayName: data.displayName || 'Admin',
      email: data.email,
      password: data.password,
      emailVerified: true,
      disabled: false,
    });
    await authService.setCustomUserClaims(adminUser.uid, {role: 'admin'});

    await setupRef.set({
      createdAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    // TODO update user role in firestore

    return true;
  }
});
