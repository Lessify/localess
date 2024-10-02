
export const environment = {
  appName: 'Localess',
  firebase: {
    projectId: 'localess-local',
    appId: '1:19232484518261:web:47779533df41508d8a706b',
    storageBucket: 'localess-local.appspot.com',
    locationId: 'europe-west6',
    apiKey: 'AIzaSyAGDhKpaTfxnX7kLeXQiuD-1sBWw0z9b2g',
    authDomain: 'localess-local.firebaseapp.com',
    messagingSenderId: '19232484518261',
  },
  auth: {
    customDomain: '*',
    providers: 'GOOGLE,MICROSOFT',
  },
  login: {
    message: '',
  },
  production: false,
  test: true,
  debug: false,
  emulator : {
    enabled: true,
  },
  version: '2.1.0',
};
