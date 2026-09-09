import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_REGION,
  parseEnvFile,
  serializeEnvFile,
  configPath,
  listProjectConfigs,
  readProjectConfig,
  writeProjectConfig,
  resolveProjectId,
  requireRegion,
} from './config.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'localess-config-'));

test('parseEnvFile reads simple assignments', () => {
  assert.deepEqual(parseEnvFile('A=1\nB=two\n'), { A: '1', B: 'two' });
});

test('parseEnvFile ignores comments and blank lines', () => {
  assert.deepEqual(parseEnvFile('# note\n\nA=1\n   \n# tail\n'), { A: '1' });
});

test('parseEnvFile keeps equals signs inside the value', () => {
  assert.deepEqual(parseEnvFile('MSG=a=b=c\n'), { MSG: 'a=b=c' });
});

test('parseEnvFile preserves an empty value', () => {
  assert.deepEqual(parseEnvFile('EMPTY=\n'), { EMPTY: '' });
});

test('parseEnvFile strips surrounding quotes', () => {
  assert.deepEqual(parseEnvFile('MSG="hello world"\n'), { MSG: 'hello world' });
});

test('serializeEnvFile round-trips through parseEnvFile', () => {
  const record = { LOCALESS_PROJECT_ID: 'demo', LOCALESS_REGION: 'us-central1', LOCALESS_LOGIN_MESSAGE: '' };
  assert.deepEqual(parseEnvFile(serializeEnvFile(record)), record);
});

test('serializeEnvFile quotes values containing spaces', () => {
  assert.match(serializeEnvFile({ LOCALESS_LOGIN_MESSAGE: 'hello world' }), /LOCALESS_LOGIN_MESSAGE="hello world"/);
});

test('serializeEnvFile emits keys in sorted order', () => {
  const lines = serializeEnvFile({ B: '2', A: '1' })
    .split('\n')
    .filter(line => line.includes('='));
  assert.deepEqual(lines, ['A=1', 'B=2']);
});

test('configPath builds the dotted filename', () => {
  assert.equal(configPath('/repo', 'localess-demo'), join('/repo', '.env.localess-demo'));
});

test('listProjectConfigs finds project ids and ignores a bare .env', () => {
  const root = scratch();
  writeFileSync(join(root, '.env.beta'), 'A=1\n');
  writeFileSync(join(root, '.env.alpha'), 'A=1\n');
  writeFileSync(join(root, '.env'), 'A=1\n');
  assert.deepEqual(listProjectConfigs(root), ['alpha', 'beta']);
});

test('listProjectConfigs returns empty for a directory with no config', () => {
  assert.deepEqual(listProjectConfigs(scratch()), []);
});

test('writeProjectConfig then readProjectConfig round-trips', () => {
  const root = scratch();
  writeProjectConfig(root, 'demo', { LOCALESS_PROJECT_ID: 'demo', LOCALESS_REGION: 'europe-west1' });
  assert.equal(readProjectConfig(root, 'demo').LOCALESS_REGION, 'europe-west1');
});

test('writeProjectConfig writes a header comment naming the project', () => {
  const root = scratch();
  writeProjectConfig(root, 'demo', { LOCALESS_PROJECT_ID: 'demo' });
  assert.match(readFileSync(join(root, '.env.demo'), 'utf8'), /^# Localess deployment config for demo/);
});

test('readProjectConfig throws a named error when the file is missing', () => {
  assert.throws(() => readProjectConfig(scratch(), 'nope'), /\.env\.nope/);
});

test('resolveProjectId prefers the explicit flag', () => {
  const root = scratch();
  writeFileSync(join(root, '.env.other'), 'A=1\n');
  assert.equal(resolveProjectId(root, { flag: 'chosen' }), 'chosen');
});

test('resolveProjectId uses the single config when no flag is given', () => {
  const root = scratch();
  writeFileSync(join(root, '.env.only'), 'A=1\n');
  assert.equal(resolveProjectId(root, {}), 'only');
});

test('resolveProjectId lists the candidates when several configs exist', () => {
  const root = scratch();
  writeFileSync(join(root, '.env.alpha'), 'A=1\n');
  writeFileSync(join(root, '.env.beta'), 'A=1\n');
  assert.throws(() => resolveProjectId(root, {}), /alpha, beta/);
});

test('resolveProjectId points at setup when no config exists', () => {
  assert.throws(() => resolveProjectId(scratch(), {}), /localess:setup/);
});

test('requireRegion falls back to europe-west6 when the key is absent', () => {
  assert.equal(requireRegion({}), DEFAULT_REGION);
  assert.equal(DEFAULT_REGION, 'europe-west6');
});

test('requireRegion falls back when the key is present but empty', () => {
  assert.equal(requireRegion({ LOCALESS_REGION: '' }), DEFAULT_REGION);
});

test('requireRegion returns the configured region', () => {
  assert.equal(requireRegion({ LOCALESS_REGION: 'us-central1' }), 'us-central1');
});
