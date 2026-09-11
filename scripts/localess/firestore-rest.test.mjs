import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AUTO_ID_ALPHABET, AUTO_ID_LENGTH, autoId, toFirestoreFields, toFirestoreValue } from './firestore-rest.mjs';

test('toFirestoreValue encodes a string', () => {
  assert.deepEqual(toFirestoreValue('Hello World'), { stringValue: 'Hello World' });
});

test('toFirestoreValue encodes a boolean', () => {
  assert.deepEqual(toFirestoreValue(false), { booleanValue: false });
});

test('toFirestoreValue encodes integers as strings, as the REST API requires', () => {
  assert.deepEqual(toFirestoreValue(42), { integerValue: '42' });
});

test('toFirestoreValue keeps a non-integer as a double', () => {
  assert.deepEqual(toFirestoreValue(1.5), { doubleValue: 1.5 });
});

test('toFirestoreValue encodes null and undefined alike', () => {
  assert.deepEqual(toFirestoreValue(null), { nullValue: null });
  assert.deepEqual(toFirestoreValue(undefined), { nullValue: null });
});

test('toFirestoreValue encodes an array', () => {
  assert.deepEqual(toFirestoreValue(['a', 'b']), {
    arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] },
  });
});

test('toFirestoreValue encodes an empty array without a values key omission bug', () => {
  assert.deepEqual(toFirestoreValue([]), { arrayValue: { values: [] } });
});

test('toFirestoreValue encodes a nested object as a mapValue', () => {
  assert.deepEqual(toFirestoreValue({ id: 'en', name: 'English' }), {
    mapValue: { fields: { id: { stringValue: 'en' }, name: { stringValue: 'English' } } },
  });
});

test('toFirestoreValue encodes an array of objects, which is what locales is', () => {
  assert.deepEqual(toFirestoreValue([{ id: 'en', name: 'English' }]), {
    arrayValue: {
      values: [{ mapValue: { fields: { id: { stringValue: 'en' }, name: { stringValue: 'English' } } } }],
    },
  });
});

test('toFirestoreValue encodes a Date as a timestamp', () => {
  assert.deepEqual(toFirestoreValue(new Date('2026-09-11T00:00:00.000Z')), {
    timestampValue: '2026-09-11T00:00:00.000Z',
  });
});

test('toFirestoreFields encodes every key of a record', () => {
  assert.deepEqual(toFirestoreFields({ name: 'x', disabled: false }), {
    name: { stringValue: 'x' },
    disabled: { booleanValue: false },
  });
});

test('toFirestoreFields returns an empty map for an empty record', () => {
  assert.deepEqual(toFirestoreFields({}), {});
});

test('autoId produces an id of the length Firestore uses', () => {
  assert.equal(autoId().length, AUTO_ID_LENGTH);
});

test('autoId only uses characters from the Firestore alphabet', () => {
  for (const character of autoId()) assert.ok(AUTO_ID_ALPHABET.includes(character), `${character} is not in the alphabet`);
});

test('the alphabet is the 62 characters the Firestore SDKs use', () => {
  assert.equal(AUTO_ID_ALPHABET.length, 62);
});

test('autoId does not repeat itself', () => {
  const ids = new Set(Array.from({ length: 200 }, () => autoId()));
  assert.equal(ids.size, 200);
});

test('autoId discards bytes that would bias the distribution', () => {
  // 256 is not a multiple of 62, so folding every byte with % would make the first
  // characters of the alphabet more likely. Bytes >= 248 must be discarded instead.
  const bytes = [250, 251, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  let offset = 0;
  const random = size => Buffer.from(bytes.slice(offset, (offset += size)));
  assert.equal(autoId(random), AUTO_ID_ALPHABET.slice(0, AUTO_ID_LENGTH));
});
