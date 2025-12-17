import { env } from './env';
import config from './firebase-config.json';

export const environment = {
  appName: 'Localess',
  firebase: config,
  auth: {
    customDomain: env.LOCALESS_AUTH_CUSTOM_DOMAIN,
    providers: env.LOCALESS_AUTH_PROVIDERS,
  },
  login: {
    message: env.LOCALESS_LOGIN_MESSAGE,
  },
  plugins: {
    unsplash: env.LOCALESS_UNSPLASH_ENABLE === 'true',
  },
  production: true,
  test: false,
  debug: false,
  emulator: {
    enabled: false,
  },
  version: '2.6.0',
};
