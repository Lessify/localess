/** The outside services an admin can connect in Admin → Settings → Integrations. */
export type IntegrationId = 'deepl' | 'google-translate' | 'unsplash';

/** The groups the Integrations page shows its cards in. */
export type IntegrationCategory = 'translation' | 'assets';

/**
 * One value an integration needs. `secret` and `file` values are stored encrypted and never sent back (only a hint);
 * `text` values are stored and shown. `env` is where the value comes from when the integration is env-locked.
 */
export interface IntegrationField {
  key: string;
  label: string;
  type: 'secret' | 'text' | 'file';
  env?: string;
  default?: string;
  optional?: boolean;
  /** For `file`: the file picker's `accept`. */
  accept?: string;
}

/**
 * What the server and the web know about an integration: the env lock, the stored fields and the generated form. Adding
 * an integration is one definition here plus its provider on the server.
 */
export interface IntegrationDefinition {
  id: IntegrationId;
  category: IntegrationCategory;
  name: string;
  description: string;
  /** Where to get a key ("How do I get one?"). */
  helpUrl: string;
  /** Env vars whose presence means "configured by the environment": the card is read-only and all values come from env. */
  lockEnv: string[];
  fields: IntegrationField[];
}

export const DEEPL_INTEGRATION: IntegrationDefinition = {
  id: 'deepl',
  category: 'translation',
  name: 'DeepL',
  description: 'High-quality machine translation for the most used languages',
  helpUrl: 'https://www.deepl.com/your-account/keys',
  lockEnv: ['DEEPL_API_KEY'],
  fields: [{ key: 'apiKey', label: 'API key', type: 'secret', env: 'DEEPL_API_KEY' }],
};

export const GOOGLE_TRANSLATE_INTEGRATION: IntegrationDefinition = {
  id: 'google-translate',
  category: 'translation',
  name: 'Google Cloud Translation',
  description: 'Machine translation for over a hundred languages through your Google Cloud project',
  helpUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
  // The env equivalent of the service-account JSON is Application Default Credentials, which is not a value.
  lockEnv: ['GOOGLE_CLOUD_PROJECT'],
  fields: [
    { key: 'serviceAccount', label: 'Service account key (JSON)', type: 'file', accept: '.json,application/json' },
    { key: 'location', label: 'Location', type: 'text', default: 'global', optional: true, env: 'LOCALESS_GOOGLE_TRANSLATE_LOCATION' },
  ],
};

export const UNSPLASH_INTEGRATION: IntegrationDefinition = {
  id: 'unsplash',
  category: 'assets',
  name: 'Unsplash',
  description: 'Pick free stock photos straight into Assets',
  helpUrl: 'https://unsplash.com/oauth/applications',
  lockEnv: ['UNSPLASH_API_KEY'],
  fields: [{ key: 'apiKey', label: 'Access Key', type: 'secret', env: 'UNSPLASH_API_KEY' }],
};

/** Every integration, in the order the page shows them. */
export const INTEGRATIONS: readonly IntegrationDefinition[] = [DEEPL_INTEGRATION, GOOGLE_TRANSLATE_INTEGRATION, UNSPLASH_INTEGRATION];

export const INTEGRATION_IDS = INTEGRATIONS.map(it => it.id) as [IntegrationId, ...IntegrationId[]];

export function integrationDefinition(id: IntegrationId): IntegrationDefinition {
  const definition = INTEGRATIONS.find(it => it.id === id);
  if (!definition) throw new Error(`Unknown integration: ${id}`);
  return definition;
}

/** `unreadable`: the saved values can't be decrypted on this server (computed, never stored). */
export type IntegrationStatus = 'verified' | 'unverified' | 'rejected' | 'quota' | 'unreadable';

/** Where the active configuration comes from. */
export type IntegrationSource = 'env' | 'ui' | 'none';

/** An integration as Admin → Settings shows it. Never carries a secret: `hints` holds `••••` + the last 4 characters. */
export interface Integration {
  id: IntegrationId;
  source: IntegrationSource;
  enabled: boolean;
  /** The lock variables that are set (env source only). */
  envVars: string[];
  hints: Record<string, string>;
  status?: IntegrationStatus;
  statusMessage?: string;
  statusAt?: string;
  updatedAt?: string;
  /** Email of the admin who saved it. */
  updatedBy?: string;
}

/** The answer of a test call, in plain words for the admin. */
export interface IntegrationTestResult {
  ok: boolean;
  reason?: 'auth' | 'quota' | 'setup' | 'unreachable' | 'invalid';
  message: string;
  /** Extra facts on success (plan, quota used, rate limit). */
  details?: string;
  /** Where to fix the problem, or to get more (Unsplash Production). */
  fixUrl?: string;
}

/** The machine translation provider tried first when both are connected. */
export type TranslatePrimary = 'deepl' | 'google-translate';

export interface IntegrationList {
  integrations: Integration[];
  translatePrimary: { value: TranslatePrimary; source: 'env' | 'ui' | 'default' };
}
