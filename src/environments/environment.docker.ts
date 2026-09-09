import config from './firebase-config.json';

export const environment = {
  appName: 'Localess',
  firebase: config,
  functions: {
    region: 'europe-west6',
  },
  auth: {
    customDomain: '*',
    providers: 'GOOGLE,MICROSOFT',
  },
  login: {
    message: '',
  },
  plugins: {
    unsplash: false,
  },
  production: false,
  test: true,
  debug: false,
  emulator: {
    enabled: true,
  },
  version: '4.0.0',
};
