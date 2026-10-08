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

test('no configuration swaps in a Firebase SDK config or bakes in LOCALESS_* constants', () => {
  // The app talks to its own server now and reads runtime settings from GET /api/config, so the
  // same build serves every install (server/README.md). Firebase-era build wiring must not return.
  for (const [name, configuration] of Object.entries(configurations)) {
    assert.ok(!asPairs(configuration.fileReplacements).some(pair => pair.includes('firebase-config')), `${name} replaces a Firebase config`);
    assert.equal(configuration.define, undefined, `${name} defines build-time constants`);
  }
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
