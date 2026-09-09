import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BUILD_CONSTANTS, resolveConstants, toDefineArgs } from './defines.mjs';

test('resolveConstants falls back to the default region when the key is absent or blank', () => {
  assert.equal(resolveConstants({}).LOCALESS_REGION, 'europe-west6');
  assert.equal(resolveConstants({ LOCALESS_REGION: '' }).LOCALESS_REGION, 'europe-west6');
  assert.equal(resolveConstants({ LOCALESS_REGION: 'us-central1' }).LOCALESS_REGION, 'us-central1');
});

test('resolveConstants ignores keys that are not build constants', () => {
  const resolved = resolveConstants({ LOCALESS_PROJECT_ID: 'demo', NOT_MINE: 'x' });
  assert.deepEqual(Object.keys(resolved).sort(), Object.keys(BUILD_CONSTANTS).sort());
});

test('toDefineArgs emits every constant so no identifier is left undefined', () => {
  const args = toDefineArgs({});
  assert.equal(args.length, Object.keys(BUILD_CONSTANTS).length * 2);
  for (const key of Object.keys(BUILD_CONSTANTS)) {
    assert.ok(
      args.some(arg => arg.startsWith(`${key}=`)),
      `${key} is missing; an undeclared define is a runtime ReferenceError, not undefined`,
    );
  }
});

test('toDefineArgs quotes values as JavaScript string literals', () => {
  const args = toDefineArgs({ LOCALESS_REGION: 'us-central1' });
  const index = args.indexOf('LOCALESS_REGION="us-central1"');
  assert.notEqual(index, -1);
  assert.equal(args[index - 1], '--define');
});

test('toDefineArgs escapes quotes so a login message cannot break the expression', () => {
  const args = toDefineArgs({ LOCALESS_LOGIN_MESSAGE: 'Say "hi"' });
  assert.ok(args.includes('LOCALESS_LOGIN_MESSAGE="Say \\"hi\\""'));
});

test('toDefineArgs escapes newlines', () => {
  const args = toDefineArgs({ LOCALESS_LOGIN_MESSAGE: 'a\nb' });
  assert.ok(args.includes('LOCALESS_LOGIN_MESSAGE="a\\nb"'));
});
