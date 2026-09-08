import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { withRewriteRegion, writeFirebaseJson, writeFunctionsEnv } from './generate.mjs';

const baseConfig = () => ({
  hosting: {
    public: 'dist/localess/browser',
    rewrites: [
      { source: '/api/v1/**', function: 'publicv1', region: 'europe-west6' },
      { source: '**', destination: '/index.html' },
    ],
  },
});

test('withRewriteRegion rewrites the publicv1 region', () => {
  const result = withRewriteRegion(baseConfig(), 'us-central1');
  assert.equal(result.hosting.rewrites[0].region, 'us-central1');
});

test('withRewriteRegion leaves non-function rewrites untouched', () => {
  const result = withRewriteRegion(baseConfig(), 'us-central1');
  assert.deepEqual(result.hosting.rewrites[1], { source: '**', destination: '/index.html' });
});

test('withRewriteRegion is the identity at the default region', () => {
  const input = baseConfig();
  assert.deepEqual(withRewriteRegion(input, 'europe-west6'), input);
});

test('withRewriteRegion does not mutate its input', () => {
  const input = baseConfig();
  withRewriteRegion(input, 'asia-northeast1');
  assert.equal(input.hosting.rewrites[0].region, 'europe-west6');
});

test('withRewriteRegion is a no-op when there is no hosting block', () => {
  assert.deepEqual(withRewriteRegion({ firestore: { rules: 'firestore.rules' } }, 'us-east1'), {
    firestore: { rules: 'firestore.rules' },
  });
});

test('withRewriteRegion is a no-op when there are no rewrites', () => {
  const input = { hosting: { public: 'dist' } };
  assert.deepEqual(withRewriteRegion(input, 'us-east1'), input);
});

test('writeFirebaseJson emits firebase.<id>.json beside firebase.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'localess-gen-'));
  writeFileSync(join(root, 'firebase.json'), JSON.stringify(baseConfig()));
  const path = writeFirebaseJson(root, 'demo', 'us-central1');
  assert.equal(path, join(root, 'firebase.demo.json'));
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).hosting.rewrites[0].region, 'us-central1');
});

test('writeFirebaseJson output is byte-identical to firebase.json at the default region', () => {
  const root = mkdtempSync(join(tmpdir(), 'localess-gen-'));
  const source = `${JSON.stringify(baseConfig(), null, 2)}\n`;
  writeFileSync(join(root, 'firebase.json'), source);
  assert.equal(readFileSync(writeFirebaseJson(root, 'demo', 'europe-west6'), 'utf8'), source);
});

test('withRewriteRegion is semantically the identity on the real firebase.json', () => {
  // The generated file is JSON.stringify'd, so it will not be byte-identical to the
  // prettier-formatted firebase.json. Semantic identity is the guarantee that matters:
  // the Firebase CLI is the only consumer, and it parses.
  const real = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'firebase.json'), 'utf8'));
  assert.deepEqual(withRewriteRegion(real, 'europe-west6'), real);
});

test('withRewriteRegion changes exactly one field on the real firebase.json', () => {
  const real = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'firebase.json'), 'utf8'));
  const patched = withRewriteRegion(real, 'us-central1');
  const rewrite = patched.hosting.rewrites.find(r => r.function === 'publicv1');
  assert.equal(rewrite.region, 'us-central1');
  assert.deepEqual(withRewriteRegion(patched, 'europe-west6'), real);
});

function functionsRoot() {
  const root = mkdtempSync(join(tmpdir(), 'localess-gen-'));
  mkdirSync(join(root, 'functions'));
  return root;
}

test('writeFunctionsEnv writes REGION to the per-project file', () => {
  const root = functionsRoot();
  const path = writeFunctionsEnv(root, 'demo', 'asia-northeast1');
  // firebase-tools loads functions/.env.<projectId> after functions/.env, so the
  // per-project value wins and two projects cannot clobber each other.
  assert.equal(path, join(root, 'functions', '.env.demo'));
  assert.equal(readFileSync(path, 'utf8'), 'REGION=asia-northeast1\n');
});

test('writeFunctionsEnv keeps separate files per project', () => {
  const root = functionsRoot();
  writeFunctionsEnv(root, 'alpha', 'europe-west6');
  writeFunctionsEnv(root, 'beta', 'us-central1');
  assert.equal(readFileSync(join(root, 'functions', '.env.alpha'), 'utf8'), 'REGION=europe-west6\n');
  assert.equal(readFileSync(join(root, 'functions', '.env.beta'), 'utf8'), 'REGION=us-central1\n');
});

test('writeFunctionsEnv never touches functions/.env or another project file', () => {
  const root = functionsRoot();
  writeFileSync(join(root, 'functions', '.env'), '# secrets\nDEEPL_API_KEY=abc\n');
  writeFileSync(join(root, 'functions', '.env.other'), 'REGION=us-east1\n');

  writeFunctionsEnv(root, 'demo', 'europe-west6');

  assert.equal(readFileSync(join(root, 'functions', '.env'), 'utf8'), '# secrets\nDEEPL_API_KEY=abc\n');
  assert.equal(readFileSync(join(root, 'functions', '.env.other'), 'utf8'), 'REGION=us-east1\n');
});
