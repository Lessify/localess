import { test } from 'node:test';
import assert from 'node:assert/strict';

import { REQUIRED_APIS, missingApis } from './apis.mjs';

test('missingApis finds nothing when every required API is enabled', () => {
  assert.deepEqual(missingApis(new Set(REQUIRED_APIS)), []);
});

test('missingApis ignores the unrelated APIs a project also has on', () => {
  const enabled = new Set([...REQUIRED_APIS, 'bigquery.googleapis.com', 'analyticshub.googleapis.com']);
  assert.deepEqual(missingApis(enabled), []);
});

test('missingApis names what is off, in declaration order', () => {
  const enabled = new Set(REQUIRED_APIS.filter(api => api !== 'translate.googleapis.com' && api !== 'firestore.googleapis.com'));
  assert.deepEqual(missingApis(enabled), ['firestore.googleapis.com', 'translate.googleapis.com']);
});

test('missingApis accepts a plain array as well as a Set', () => {
  assert.deepEqual(missingApis([...REQUIRED_APIS]), []);
});

/**
 * `listEnabledApis` returns null when the list cannot be read. Treating that as "none are
 * enabled" makes the caller re-enable everything, which is idempotent - the alternative,
 * assuming they are all on, would let a failed check turn into a failed deploy.
 */
test('missingApis treats an unreadable list as everything missing', () => {
  assert.deepEqual(missingApis(null), [...REQUIRED_APIS]);
  assert.deepEqual(missingApis(undefined), [...REQUIRED_APIS]);
});

test('REQUIRED_APIS is frozen so a caller cannot mutate the shared list', () => {
  assert.equal(Object.isFrozen(REQUIRED_APIS), true);
});

test('missingApis returns a fresh array rather than the shared constant', () => {
  const missing = missingApis(null);
  missing.pop();
  assert.equal(REQUIRED_APIS.length, 15);
});
