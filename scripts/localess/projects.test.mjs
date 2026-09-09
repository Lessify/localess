import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertManaged } from './projects.mjs';

test('assertManaged accepts a marked project', () => {
  assert.doesNotThrow(() => assertManaged('demo', { managed: true, hasLocalessWebApp: false }));
});

test('assertManaged names the adopt command for an unmarked project', () => {
  assert.throws(() => assertManaged('demo', { managed: false, hasLocalessWebApp: false }), /npm run setup:firebase -- --project demo/);
});

test('assertManaged explains the weak signal when a Localess web app is present', () => {
  assert.throws(() => assertManaged('demo', { managed: false, hasLocalessWebApp: true }), /Localess web app but no localess-managed label/);
});

test('assertManaged does not claim a web app when there is none', () => {
  assert.throws(() => assertManaged('demo', { managed: false, hasLocalessWebApp: false }), /is not a Localess project/);
});
