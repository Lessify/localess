
export const environment = {
  appName: 'Localess',
  firebase: {
    projectId: 'demo-localess-dev',
    appId: '1:19232484518261:web:47779533df41508d8a706b',
    storageBucket: 'demo-localess-dev.appspot.com',
    locationId: 'europe-west6',
    apiKey: 'AIzaSyAGDhKpaTfxnX7kLeXQiuD-1sBWw0z9b2g',
    authDomain: 'demo-localess-dev.firebaseapp.com',
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
  version: '2.2.0',
};
