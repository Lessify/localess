import config from './firebase-config.json';

// The LOCALESS_* identifiers are compile-time constants inlined by esbuild; see
// build-constants.d.ts and the `define` block in angular.json.
export const environment = {
  appName: 'Localess',
  firebase: config,
  functions: {
    region: LOCALESS_REGION,
  },
  auth: {
    customDomain: LOCALESS_AUTH_CUSTOM_DOMAIN,
    providers: LOCALESS_AUTH_PROVIDERS,
  },
  login: {
    message: LOCALESS_LOGIN_MESSAGE,
  },
  plugins: {
    unsplash: LOCALESS_UNSPLASH_ENABLE === 'true',
  },
  production: true,
  test: false,
  debug: false,
  emulator: {
    enabled: false,
  },
  version: '4.0.0',
};
