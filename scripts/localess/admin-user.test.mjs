import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createFirstAdmin, describeSetupFailure, isTransientSetupFailure, setupFunctionUri } from './admin-user.mjs';

const URI = 'https://europe-west6-my-localess.cloudfunctions.net/setup';

const ok = () => ({ ok: true, status: 200, json: async () => ({ result: null }) });
const err = (status, body) => ({ ok: false, status, json: async () => body });

test('setupFunctionUri finds the deployed setup callable', () => {
  const deployed = [{ id: 'translate', uri: 'https://other' }, { id: 'setup', uri: URI }];
  assert.equal(setupFunctionUri(deployed), URI);
});

test('setupFunctionUri returns null when setup is not deployed', () => {
  assert.equal(setupFunctionUri([{ id: 'translate', uri: 'https://other' }]), null);
  assert.equal(setupFunctionUri([]), null);
  assert.equal(setupFunctionUri(null), null);
});

test('describeSetupFailure explains an already-completed setup', () => {
  const message = describeSetupFailure(409, { error: { status: 'ALREADY_EXISTS', message: 'already-exists' } });
  assert.match(message, /already been completed/);
});

test('describeSetupFailure recognises already-exists from the message alone', () => {
  // The callable throws HttpsError('already-exists'), whose wire status varies by runtime.
  assert.match(describeSetupFailure(400, { error: { message: 'already-exists' } }), /already been completed/);
});

test('describeSetupFailure blames the invoker binding for a 403', () => {
  assert.match(describeSetupFailure(403, null), /invoker binding/);
});

test('describeSetupFailure falls back to the raw message', () => {
  assert.match(describeSetupFailure(500, { error: { message: 'INTERNAL' } }), /INTERNAL \(HTTP 500\)/);
});

test('describeSetupFailure copes with a body that is not JSON', () => {
  // Cloud Run's own 403 page is HTML, so there is no body to read.
  assert.equal(typeof describeSetupFailure(404, null), 'string');
});

test('isTransientSetupFailure retries a propagating invoker binding', () => {
  assert.equal(isTransientSetupFailure(403, null), true);
  assert.equal(isTransientSetupFailure(200, { error: { status: 'PERMISSION_DENIED' } }), true);
});

test('isTransientSetupFailure retries a server error', () => {
  assert.equal(isTransientSetupFailure(503, null), true);
});

test('isTransientSetupFailure does not retry an already-completed setup', () => {
  // Retrying would be pointless, and this is the one call that must never be repeated
  // carelessly - it creates an account.
  assert.equal(isTransientSetupFailure(409, { error: { status: 'ALREADY_EXISTS' } }), false);
});

test('createFirstAdmin posts the credentials in the callable envelope', async () => {
  let seen;
  await createFirstAdmin(URI, { email: 'a@example.com', password: 'secret1', displayName: 'Admin' }, {
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return ok();
    },
  });

  assert.equal(seen.url, URI);
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(seen.init.body), {
    data: { email: 'a@example.com', password: 'secret1', displayName: 'Admin' },
  });
});

test('createFirstAdmin retries while the invoker binding propagates', async () => {
  let calls = 0;
  await createFirstAdmin(
    URI,
    { email: 'a@example.com', password: 'secret1' },
    {
      delayMs: 0,
      fetchImpl: async () => {
        calls += 1;
        return calls < 3 ? err(403, null) : ok();
      },
    },
  );
  assert.equal(calls, 3);
});

test('createFirstAdmin gives up after the last attempt and explains why', async () => {
  let calls = 0;
  await assert.rejects(
    createFirstAdmin(
      URI,
      { email: 'a@example.com', password: 'secret1' },
      {
        attempts: 2,
        delayMs: 0,
        fetchImpl: async () => {
          calls += 1;
          return err(403, null);
        },
      },
    ),
    /invoker binding/,
  );
  assert.equal(calls, 2);
});

test('createFirstAdmin does not repeat a call that created an account', async () => {
  // The whole point of the transient/permanent split: an already-exists means a user is
  // there, and hammering the endpoint cannot help.
  let calls = 0;
  await assert.rejects(
    createFirstAdmin(
      URI,
      { email: 'a@example.com', password: 'secret1' },
      {
        delayMs: 0,
        fetchImpl: async () => {
          calls += 1;
          return err(409, { error: { status: 'ALREADY_EXISTS' } });
        },
      },
    ),
    /already been completed/,
  );
  assert.equal(calls, 1);
});
