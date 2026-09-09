import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ensureFirebaseConfig } from './placeholder.mjs';

function scratch() {
  const root = mkdtempSync(join(tmpdir(), 'localess-ph-'));
  mkdirSync(join(root, 'src', 'environments'), { recursive: true });
  return root;
}

test('ensureFirebaseConfig writes a placeholder when the file is absent', () => {
  const root = scratch();
  assert.equal(ensureFirebaseConfig(root), true);
  const written = JSON.parse(readFileSync(join(root, 'src/environments/firebase-config.json'), 'utf8'));
  assert.equal(written.projectId, '');
  assert.equal(written.version, '2');
});

test('ensureFirebaseConfig never overwrites a fetched config', () => {
  const root = scratch();
  const path = join(root, 'src/environments/firebase-config.json');
  writeFileSync(path, '{"projectId":"real-project"}');
  assert.equal(ensureFirebaseConfig(root), false);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).projectId, 'real-project');
});

test('the placeholder has every key the environment files rely on', () => {
  const root = scratch();
  ensureFirebaseConfig(root);
  const written = JSON.parse(readFileSync(join(root, 'src/environments/firebase-config.json'), 'utf8'));
  for (const key of ['projectId', 'appId', 'storageBucket', 'locationId', 'apiKey', 'authDomain', 'messagingSenderId']) {
    assert.ok(key in written, `missing ${key}`);
  }
});
