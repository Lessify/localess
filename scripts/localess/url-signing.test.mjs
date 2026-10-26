import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SIGNER_ROLE, canSign, runtimeServiceAccount } from './url-signing.mjs';

const SA = runtimeServiceAccount('123456');

test('runtimeServiceAccount names the default compute service account', () => {
  assert.equal(SA, '123456-compute@developer.gserviceaccount.com');
});

test('canSign is true when the account holds the signer role on itself', () => {
  assert.equal(canSign({ bindings: [{ role: SIGNER_ROLE, members: [`serviceAccount:${SA}`] }] }, SA), true);
});

test('canSign is false when the role is held by someone else', () => {
  const policy = { bindings: [{ role: SIGNER_ROLE, members: ['serviceAccount:other@example.iam.gserviceaccount.com'] }] };
  assert.equal(canSign(policy, SA), false);
});

test('canSign is false when the account holds a different role', () => {
  assert.equal(canSign({ bindings: [{ role: 'roles/iam.serviceAccountUser', members: [`serviceAccount:${SA}`] }] }, SA), false);
});

test('canSign is false for an empty policy', () => {
  assert.equal(canSign({}, SA), false);
  assert.equal(canSign(undefined, SA), false);
});
