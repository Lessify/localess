// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  appName: 'Localess [Dev]',
  firebase: {
    projectId: 'localess-dev',
    appId: '1:19232484518261:web:47779533df41508d8a706b',
    storageBucket: 'localess-dev.appspot.com',
    locationId: 'europe-west6',
    apiKey: 'AIzaSyAGDhKpaTfxnX7kLeXQiuD-1sBWw0z9b2g',
    authDomain: 'localess-dev.firebaseapp.com',
    messagingSenderId: '19232484518261',
  },
  auth: {
    customDomain: '*',
    providers: 'GOOGLE,MICROSOFT',
  },
  login: {
    message: 'Hello Login Message',
  },
  production: false,
  test: true,
  debug: true,
  emulator : {
    enabled: true,
  },
  version: '2.1.0',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
