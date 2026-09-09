import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_TARGETS, buildDeployArgs, parseTargets } from './deploy-plan.mjs';

test('parseTargets defaults to the full set including auth', () => {
  assert.deepEqual(parseTargets(undefined), ['hosting', 'functions', 'storage', 'firestore', 'auth']);
});

test('parseTargets does not let a caller mutate the default set', () => {
  parseTargets(undefined).push('remoteconfig');
  assert.equal(DEFAULT_TARGETS.includes('remoteconfig'), false);
});

test('parseTargets splits and trims an --only list', () => {
  assert.deepEqual(parseTargets('hosting, functions'), ['hosting', 'functions']);
});

test('parseTargets rejects an unknown target before firebase is invoked', () => {
  assert.throws(() => parseTargets('hosting,nonsens'), /Unknown deploy target: nonsens/);
});

test('parseTargets lists every unknown target at once', () => {
  assert.throws(() => parseTargets('nope,alsonope'), /Unknown deploy targets: nope, alsonope/);
});

test('parseTargets accepts a scoped target such as functions:publicv1', () => {
  assert.deepEqual(parseTargets('functions:publicv1'), ['functions:publicv1']);
});

test('parseTargets rejects an empty --only', () => {
  assert.throws(() => parseTargets(''), /no targets/);
  assert.throws(() => parseTargets('  ,  '), /no targets/);
});

test('parseTargets allows remoteconfig when it is asked for explicitly', () => {
  assert.deepEqual(parseTargets('remoteconfig'), ['remoteconfig']);
});

test('buildDeployArgs produces a non-interactive deploy against the generated config', () => {
  assert.deepEqual(buildDeployArgs({ configPath: 'firebase.demo.json', projectId: 'demo', targets: ['hosting', 'auth'] }), [
    'deploy',
    '--config',
    'firebase.demo.json',
    '--project',
    'demo',
    '--only',
    'hosting,auth',
    '--non-interactive',
  ]);
});
