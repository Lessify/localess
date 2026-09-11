import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authService, firestoreService } from './config';
import { DEFAULT_LOCALE } from './models';
import { createSpace } from './services';

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
    logger.info('[setup] ✅ The configuration already exists.');
    throw new HttpsError('already-exists', 'The configuration already exists.');
  }
  // Create first admin user
  logger.info('[setup] 🔧 Creating the first admin user...');
  const adminUser = await authService.createUser({
    displayName: request.data.displayName || 'Admin',
    email: request.data.email,
    password: request.data.password,
    emailVerified: true,
    disabled: false,
  });
  await authService.setCustomUserClaims(adminUser.uid, { role: 'admin' });
  logger.info(`[setup] ✅ First admin user created with UID: ${adminUser.uid}`);

  // Bucket CORS is no longer set here. It is infrastructure, and doing it from this callable
  // meant it ran exactly once per project - behind the `configs/setup` guard below - so a
  // change to the rules could never reach an existing install. `npm run localess:setup` and
  // `npm run localess:deploy` now apply it, and re-check it on every run.

  await setupRef.set(
    {
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // TODO update user role in firestore
  // Create first Space
  await createSpace({
    name: 'Hello World',
    locales: [DEFAULT_LOCALE],
    localeFallback: DEFAULT_LOCALE,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Create token for the first user
  // TODO: Not working as it require a special role
  // return await authService.createCustomToken(adminUser.uid);
});
