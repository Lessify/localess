import {env} from './env'

export const environment = {
  appName: "Localess",
  firebase: {
    projectId: env.LOCALESS_FIREBASE_PROJECT_ID,
    appId: env.LOCALESS_FIREBASE_APP_ID,
    storageBucket: env.LOCALESS_FIREBASE_STORAGE_BUCKET,
    locationId: env.LOCALESS_FIREBASE_LOCATION_ID,
    apiKey: env.LOCALESS_FIREBASE_API_KEY,
    authDomain: env.LOCALESS_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: env.LOCALESS_FIREBASE_MESSAGING_SENDER_ID,
  },
  production: true,
  test: false,
  useEmulators: false,
};
