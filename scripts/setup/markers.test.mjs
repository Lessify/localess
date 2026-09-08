import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MANAGED_LABEL,
  VERSION_LABEL,
  toLabelValue,
  buildMarkerLabels,
  hasMarker,
  markerVersion,
  describeProject,
} from './markers.mjs';

test('toLabelValue makes a version safe for a GCP label', () => {
  // Label values allow lowercase letters, digits, hyphens and underscores only.
  assert.equal(toLabelValue('4.0.0'), '4-0-0');
  assert.equal(toLabelValue('4.1.0-rc.1'), '4-1-0-rc-1');
  assert.equal(toLabelValue('V4.0.0'), 'v4-0-0');
});

test('toLabelValue truncates to the 63-character limit', () => {
  assert.equal(toLabelValue('a'.repeat(80)).length, 63);
});

test('buildMarkerLabels sets both markers', () => {
  const labels = buildMarkerLabels('4.0.0');
  assert.equal(labels[MANAGED_LABEL], 'true');
  assert.equal(labels[VERSION_LABEL], '4-0-0');
});

test('hasMarker detects a managed project', () => {
  assert.equal(hasMarker({ [MANAGED_LABEL]: 'true' }), true);
  assert.equal(hasMarker({ firebase: 'enabled' }), false);
  assert.equal(hasMarker(undefined), false);
});

test('markerVersion reads the version back in dotted form', () => {
  assert.equal(markerVersion({ [VERSION_LABEL]: '4-0-0' }), '4.0.0');
  assert.equal(markerVersion({}), null);
});

test('describeProject flags a verified Localess project', () => {
  const d = describeProject({ configuredLocally: true, remote: { reachable: true, labels: buildMarkerLabels('4.0.0') } });
  assert.equal(d.priority, true);
  assert.match(d.note, /local config/);
  assert.match(d.note, /Localess 4\.0\.0/);
});

test('describeProject warns when local config has no remote marker', () => {
  const d = describeProject({ configuredLocally: true, remote: { reachable: true, labels: { firebase: 'enabled' } } });
  assert.equal(d.priority, true);
  assert.match(d.note, /no Localess marker/);
});

test('describeProject falls back to the web app name when there is no label', () => {
  const d = describeProject({
    configuredLocally: true,
    remote: { reachable: true, labels: {}, hasLocalessWebApp: true },
  });
  assert.match(d.note, /Localess web app/);
});

test('describeProject says so when the remote check failed', () => {
  const d = describeProject({ configuredLocally: true, remote: { reachable: false } });
  assert.equal(d.priority, true);
  assert.match(d.note, /could not verify/);
});

test('describeProject marks a remotely-detected project even without local config', () => {
  const d = describeProject({ configuredLocally: false, remote: { reachable: true, labels: buildMarkerLabels('4.0.0') } });
  assert.equal(d.priority, true);
  assert.match(d.note, /Localess 4\.0\.0/);
  assert.doesNotMatch(d.note, /local config/);
});

test('describeProject leaves an unrelated project unannotated', () => {
  const d = describeProject({ configuredLocally: false, remote: null });
  assert.equal(d.priority, false);
  assert.equal(d.note, undefined);
});
