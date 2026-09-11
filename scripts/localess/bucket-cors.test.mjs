import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BUCKET_CORS, needsBucketCors } from './bucket-cors.mjs';

test('needsBucketCors is true for a bucket with no rules', () => {
  assert.equal(needsBucketCors([]), true);
});

/**
 * The case this whole check exists for: `localess-setup-test` was fully deployed and still
 * had no `cors` field, because nobody had opened the web setup wizard that used to set it.
 */
test('an absent cors field reads as needing the rules', () => {
  const fromApi = undefined;
  assert.equal(needsBucketCors(fromApi ?? []), true);
});

test('needsBucketCors leaves an existing configuration alone', () => {
  const custom = [{ origin: ['https://cms.example.com'], method: ['GET'], maxAgeSeconds: 60 }];
  assert.equal(needsBucketCors(custom), false);
});

test('needsBucketCors leaves the default configuration alone once applied', () => {
  assert.equal(needsBucketCors([...BUCKET_CORS]), false);
});

test('needsBucketCors is false when the configuration could not be read', () => {
  // `getBucketCors` returns null for an unreadable bucket, which must never be mistaken for
  // "empty" - overwriting rules we failed to read would be worse than doing nothing.
  assert.equal(needsBucketCors(null), false);
});

test('the default rules are read-only access from any origin', () => {
  assert.equal(BUCKET_CORS.length, 1);
  assert.deepEqual([...BUCKET_CORS[0].origin], ['*']);
  assert.deepEqual([...BUCKET_CORS[0].method], ['GET', 'HEAD']);
  assert.equal(BUCKET_CORS[0].maxAgeSeconds, 3600);
});

test('BUCKET_CORS is frozen so a caller cannot mutate the shared policy', () => {
  assert.equal(Object.isFrozen(BUCKET_CORS), true);
  assert.equal(Object.isFrozen(BUCKET_CORS[0]), true);
});
