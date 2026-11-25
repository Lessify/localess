import type { IntegrationId } from '@localess/shared';

import type { AppConfig } from '../../infra/config/config.js';
import { DeeplIntegration } from './deepl.integration.js';
import { GoogleTranslateIntegration } from './google-translate.integration.js';
import { UnsplashIntegration } from './unsplash.integration.js';

export { googleCredentials } from './google-translate.integration.js';

/** Every integration's provider. A new integration adds its definition (@localess/shared) and one entry here. */
export interface IntegrationProviders {
  deepl: DeeplIntegration;
  'google-translate': GoogleTranslateIntegration;
  unsplash: UnsplashIntegration;
}

export function integrationProviders(config: Pick<AppConfig, 'deeplApiUrl' | 'unsplashApiUrl'>): IntegrationProviders {
  return {
    deepl: new DeeplIntegration(config),
    'google-translate': new GoogleTranslateIntegration(),
    unsplash: new UnsplashIntegration(config),
  } satisfies Record<IntegrationId, unknown>;
}

/** The providers as one injectable, for the services that call them. */
export const INTEGRATION_PROVIDERS = Symbol('INTEGRATION_PROVIDERS');
