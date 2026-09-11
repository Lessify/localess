import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_ROLE,
  DEFAULT_LOCALE,
  adminUserFields,
  buildBootstrapWrites,
  createFirstAdmin,
  describeAccountFailure,
  helloWorldSpaceFields,
} from './admin-user.mjs';

const PROJECT = 'my-localess';
const LOCAL_ID = 'abc123';
const SPACE_ID = 'SPACE0000000000000AB';

/* -------------------------------------------------------------------------- */
/* Document shapes                                                            */
/* -------------------------------------------------------------------------- */

test('adminUserFields mirrors what beforeUserCreated writes', () => {
  // Pinned field by field against functions/src/users.ts. If the blocking function gains a
  // field, a first admin created by the CLI must gain it too, or the two paths diverge.
  const fields = adminUserFields({ email: 'a@example.com', displayName: 'Admin' });
  assert.deepEqual(Object.keys(fields).sort(), ['disabled', 'displayName', 'email', 'emailVerified', 'providers', 'role'].sort());
});

test('adminUserFields carries the admin role the blocking function cannot write', () => {
  // beforeUserCreated says "custom claims are not available at this point", which is why
  // the first admin has never appeared in Admin -> Users. This is the fix.
  assert.equal(adminUserFields({ email: 'a@example.com', displayName: 'Admin' }).role, ADMIN_ROLE);
});

test('adminUserFields marks the account verified and enabled', () => {
  const fields = adminUserFields({ email: 'a@example.com', displayName: 'Admin' });
  assert.equal(fields.emailVerified, true);
  assert.equal(fields.disabled, false);
});

test('adminUserFields records the password provider', () => {
  // Confirmed live: providerUserInfo[0].providerId is 'password' for an email/password
  // account, which is what beforeUserCreated would have derived from providerData.
  assert.deepEqual(adminUserFields({ email: 'a@example.com', displayName: 'Admin' }).providers, ['password']);
});

test('adminUserFields omits photoURL and phoneNumber rather than writing them', () => {
  // The blocking function uses FieldValue.delete() for both, which means absent. Absent is
  // the same end state, and writing nulls would not be.
  const fields = adminUserFields({ email: 'a@example.com', displayName: 'Admin' });
  assert.equal('photoURL' in fields, false);
  assert.equal('phoneNumber' in fields, false);
});

test('helloWorldSpaceFields reproduces what the setup callable seeded', () => {
  assert.deepEqual(helloWorldSpaceFields(), {
    name: 'Hello World',
    locales: [DEFAULT_LOCALE],
    localeFallback: DEFAULT_LOCALE,
  });
});

test('DEFAULT_LOCALE matches functions/src/models/space.model.ts', () => {
  assert.deepEqual(DEFAULT_LOCALE, { id: 'en', name: 'English' });
});

/* -------------------------------------------------------------------------- */
/* The commit body                                                            */
/* -------------------------------------------------------------------------- */

const writes = () =>
  buildBootstrapWrites({ projectId: PROJECT, localId: LOCAL_ID, spaceId: SPACE_ID, email: 'a@example.com', displayName: 'Admin' });

test('buildBootstrapWrites writes both documents in one commit', () => {
  // Atomic: a user document without its space, or a space without its user, is a half-done
  // bootstrap nobody asked for.
  assert.equal(writes().length, 2);
});

test('buildBootstrapWrites addresses the documents by full resource name', () => {
  const [user, space] = writes();
  assert.equal(user.update.name, `projects/${PROJECT}/databases/(default)/documents/users/${LOCAL_ID}`);
  assert.equal(space.update.name, `projects/${PROJECT}/databases/(default)/documents/spaces/${SPACE_ID}`);
});

test('buildBootstrapWrites encodes fields as Firestore typed values', () => {
  assert.deepEqual(writes()[0].update.fields.email, { stringValue: 'a@example.com' });
  assert.deepEqual(writes()[0].update.fields.disabled, { booleanValue: false });
});

test('buildBootstrapWrites encodes the nested locales array', () => {
  assert.deepEqual(writes()[1].update.fields.locales, {
    arrayValue: { values: [{ mapValue: { fields: { id: { stringValue: 'en' }, name: { stringValue: 'English' } } } }] },
  });
});

test('buildBootstrapWrites asks the server for both timestamps on both documents', () => {
  // Not the CLI's clock: everything else in Firestore uses serverTimestamp(), and a
  // bootstrap document with a skewed createdAt would sort wrongly against real data.
  for (const write of writes()) {
    assert.deepEqual(write.updateTransforms, [
      { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
      { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
    ]);
  }
});

test('buildBootstrapWrites keeps the timestamps out of the fields map', () => {
  // A field cannot be both written and transformed; the transform is the only writer.
  for (const write of writes()) {
    assert.equal('createdAt' in write.update.fields, false);
    assert.equal('updatedAt' in write.update.fields, false);
  }
});

/* -------------------------------------------------------------------------- */
/* Error mapping                                                              */
/* -------------------------------------------------------------------------- */

test('describeAccountFailure explains a duplicate email', () => {
  // Confirmed live: the duplicate response is 400 with message EMAIL_EXISTS.
  assert.match(describeAccountFailure(400, { error: { message: 'EMAIL_EXISTS' } }), /already exists/);
});

test('describeAccountFailure surfaces a rejected password', () => {
  const message = describeAccountFailure(400, { error: { message: 'WEAK_PASSWORD : Password should be at least 6 characters' } });
  assert.match(message, /at least 6 characters/);
});

test('describeAccountFailure explains an invalid email', () => {
  assert.match(describeAccountFailure(400, { error: { message: 'INVALID_EMAIL' } }), /invalid/);
});

test('describeAccountFailure falls back to the raw message and status', () => {
  assert.match(describeAccountFailure(403, { error: { message: 'PERMISSION_DENIED' } }), /PERMISSION_DENIED \(HTTP 403\)/);
});

test('describeAccountFailure copes with no body at all', () => {
  assert.equal(typeof describeAccountFailure(500, null), 'string');
});

/* -------------------------------------------------------------------------- */
/* Orchestration                                                              */
/* -------------------------------------------------------------------------- */

const credentials = { email: 'a@example.com', password: 'secret1', displayName: 'Admin' };

const spy = (overrides = {}) => {
  const calls = [];
  return {
    calls,
    deps: {
      createAccount: async (...args) => {
        calls.push(['createAccount', ...args]);
        return LOCAL_ID;
      },
      setClaims: async (...args) => void calls.push(['setClaims', ...args]),
      commit: async (...args) => void calls.push(['commit', ...args]),
      newId: () => SPACE_ID,
      ...overrides,
    },
  };
};

test('createFirstAdmin creates the account, sets the claim, then writes the documents', async () => {
  const { calls, deps } = spy();
  await createFirstAdmin(PROJECT, credentials, deps);
  assert.deepEqual(
    calls.map(call => call[0]),
    ['createAccount', 'setClaims', 'commit'],
  );
});

test('createFirstAdmin grants exactly the admin role', async () => {
  const { calls, deps } = spy();
  await createFirstAdmin(PROJECT, credentials, deps);
  const setClaims = calls.find(call => call[0] === 'setClaims');
  assert.deepEqual(setClaims[3], { role: ADMIN_ROLE });
});

test('createFirstAdmin writes the documents under the account it just created', async () => {
  const { calls, deps } = spy();
  await createFirstAdmin(PROJECT, credentials, deps);
  const commit = calls.find(call => call[0] === 'commit');
  assert.match(commit[2][0].update.name, new RegExp(`/users/${LOCAL_ID}$`));
});

test('createFirstAdmin maps a failed account creation to a readable message', async () => {
  const { deps } = spy({
    createAccount: async () => {
      const error = new Error('raw');
      error.status = 400;
      error.body = { error: { message: 'EMAIL_EXISTS' } };
      throw error;
    },
  });
  await assert.rejects(createFirstAdmin(PROJECT, credentials, deps), /already exists/);
});

test('createFirstAdmin does not write documents when the account was not created', async () => {
  const { calls, deps } = spy({
    createAccount: async () => {
      throw Object.assign(new Error('raw'), { status: 400, body: { error: { message: 'EMAIL_EXISTS' } } });
    },
  });
  await assert.rejects(createFirstAdmin(PROJECT, credentials, deps));
  assert.equal(
    calls.some(call => call[0] === 'commit'),
    false,
  );
});

test('createFirstAdmin reports the orphaned account when the commit fails', async () => {
  // The one case the callable could not produce: the account exists but its documents do
  // not. Saying so is the whole mitigation - a silent failure here is unrecoverable noise.
  const { deps } = spy({
    commit: async () => {
      throw Object.assign(new Error('raw'), { status: 403, body: { error: { message: 'PERMISSION_DENIED' } } });
    },
  });
  await assert.rejects(createFirstAdmin(PROJECT, credentials, deps), /a@example\.com was created/);
});

test('createFirstAdmin never retries - creating an account twice cannot be undone', async () => {
  let attempts = 0;
  const { deps } = spy({
    createAccount: async () => {
      attempts += 1;
      throw Object.assign(new Error('raw'), { status: 503, body: null });
    },
  });
  await assert.rejects(createFirstAdmin(PROJECT, credentials, deps));
  assert.equal(attempts, 1);
});
