
export const environment = {
  appName: 'Localess',
  firebase: {
    projectId: 'localess-dev',
    appId: '1:923248451826:web:47779533df41508d8a706b',
    storageBucket: 'localess-dev.appspot.com',
    locationId: 'europe-west6',
    apiKey: 'AIzaSyAGDhKpaTfxnX7kLeXQiuD-1sBWw0z9b2g',
    authDomain: 'localess-dev.firebaseapp.com',
    messagingSenderId: '923248451826',
  },
  auth: {
    customDomain: '*',
    providers: 'GOOGLE,MICROSOFT',
  },
  production: false,
  test: true,
  debug: false,
  emulator : {
    enabled: true,
  },
  version: '2.0.0',
};
