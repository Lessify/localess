/**
 * Guards on the workspace build configuration itself.
 *
 * These assert facts about the real `angular.json` and the tracked placeholder rather than
 * about any module, because both are load-bearing and both are easy to break by hand.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const workspace = JSON.parse(readFileSync(join(ROOT, 'angular.json'), 'utf8'));
const configurations = workspace.projects.localess.architect.build.configurations;

const asPairs = replacements => (replacements ?? []).map(({ replace, with: to }) => `${replace} -> ${to}`);

test('the deploy configuration replaces the Firebase config with the per-project build file', () => {
  assert.ok(
    asPairs(configurations.deploy.fileReplacements).includes(
      'src/environments/firebase-config.json -> src/environments/firebase-config.build.json',
    ),
  );
});

test('the deploy configuration carries every replacement production has', () => {
  // `--configuration production,deploy` is a shallow spread, so deploy's fileReplacements
  // array REPLACES production's rather than extending it. Anything production declares and
  // deploy omits is silently dropped from a real deploy - which would ship the development
  // environment to production.
  const production = asPairs(configurations.production.fileReplacements);
  const deploy = asPairs(configurations.deploy.fileReplacements);

  for (const replacement of production) {
    assert.ok(deploy.includes(replacement), `deploy is missing "${replacement}", which production declares`);
  }
});

test('production still swaps in environment.prod.ts', () => {
  assert.ok(
    asPairs(configurations.production.fileReplacements).includes(
      'src/environments/environment.ts -> src/environments/environment.prod.ts',
    ),
  );
});

test('the tracked Firebase config is a demo placeholder, not a real project', () => {
  // A `demo-` prefixed project id is what makes the Firebase emulators run fully offline,
  // and it is the guard against someone committing a client's SDK config over this file.
  const placeholder = JSON.parse(readFileSync(join(ROOT, 'src/environments/firebase-config.json'), 'utf8'));
  assert.match(placeholder.projectId, /^demo-/);
});

test('the tracked placeholder has the same shape as `firebase apps:sdkconfig` output', () => {
  const placeholder = JSON.parse(readFileSync(join(ROOT, 'src/environments/firebase-config.json'), 'utf8'));
  for (const key of ['projectId', 'appId', 'storageBucket', 'locationId', 'apiKey', 'authDomain', 'messagingSenderId']) {
    assert.ok(key in placeholder, `missing ${key}`);
  }
});
