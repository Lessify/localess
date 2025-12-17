import config from './firebase-config.json';

export const environment = {
  appName: 'Localess',
  firebase: config,
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
  version: '2.6.0',
};
