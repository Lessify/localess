import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EDITABLE_KEYS, resolveConfigRecord } from './sync.mjs';

test('resolveConfigRecord defaults the hand-edited keys when there is no local config', () => {
  const { record, defaulted } = resolveConfigRecord({ projectId: 'demo', region: 'europe-west6', existing: null });

  assert.equal(record.LOCALESS_PROJECT_ID, 'demo');
  assert.equal(record.LOCALESS_REGION, 'europe-west6');
  for (const key of EDITABLE_KEYS) assert.equal(record[key], '');
  assert.deepEqual(defaulted, [...EDITABLE_KEYS]);
});

test('resolveConfigRecord preserves hand-edited keys when a local config exists', () => {
  const existing = {
    LOCALESS_PROJECT_ID: 'demo',
    LOCALESS_REGION: 'us-central1',
    LOCALESS_LOGIN_MESSAGE: 'Welcome',
    LOCALESS_UNSPLASH_ENABLE: 'true',
    LOCALESS_AUTH_PROVIDERS: 'GOOGLE',
    LOCALESS_AUTH_CUSTOM_DOMAIN: 'auth.example.com',
  };
  const { record, defaulted } = resolveConfigRecord({ projectId: 'demo', region: 'europe-west6', existing });

  assert.equal(record.LOCALESS_LOGIN_MESSAGE, 'Welcome');
  assert.equal(record.LOCALESS_UNSPLASH_ENABLE, 'true');
  assert.equal(record.LOCALESS_AUTH_PROVIDERS, 'GOOGLE');
  assert.equal(record.LOCALESS_AUTH_CUSTOM_DOMAIN, 'auth.example.com');
  assert.deepEqual(defaulted, []);
});

test('resolveConfigRecord lets the live region overwrite a stale local one', () => {
  const existing = { LOCALESS_REGION: 'us-central1' };
  const { record } = resolveConfigRecord({ projectId: 'demo', region: 'europe-west6', existing });
  assert.equal(record.LOCALESS_REGION, 'europe-west6');
});

test('resolveConfigRecord fills a key an existing config is missing', () => {
  const { record, defaulted } = resolveConfigRecord({
    projectId: 'demo',
    region: 'europe-west6',
    existing: { LOCALESS_LOGIN_MESSAGE: 'Welcome' },
  });
  assert.equal(record.LOCALESS_AUTH_PROVIDERS, '');
  // An existing config is never reported as defaulted - the operator already owns this file.
  assert.deepEqual(defaulted, []);
});

test('resolveConfigRecord writes only known keys, so a stray key is dropped', () => {
  const { record } = resolveConfigRecord({
    projectId: 'demo',
    region: 'europe-west6',
    existing: { LOCALESS_TYPO: 'x' },
  });
  assert.equal('LOCALESS_TYPO' in record, false);
});
