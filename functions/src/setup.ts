import { logger } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { authService, firestoreService } from './config';

interface Setup {
  displayName?: string | null;
  email: string;
  password: string;
}

export const setup = onCall<Setup>(async request => {
  logger.info('[setup] data: ' + JSON.stringify(request.data));
  logger.info('[setup] context.auth: ' + JSON.stringify(request.auth));

  const setupRef = firestoreService.doc('configs/setup');
  const setupSnapshot = await setupRef.get();
  if (setupSnapshot.exists) {
    logger.info('[setup] The configuration already exists.');
    throw new HttpsError('already-exists', 'The configuration already exists.');
  } else {
    const adminUser = await authService.createUser({
      displayName: request.data.displayName || 'Admin',
      email: request.data.email,
      password: request.data.password,
      emailVerified: true,
      disabled: false,
    });
    await authService.setCustomUserClaims(adminUser.uid, { role: 'admin' });

    await setupRef.set(
      {
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // TODO update user role in firestore

    return true;
  }
});
