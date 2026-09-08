import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ZONES, allRegions, isSupportedRegion, zoneOf, toZoneChoices, toRegionChoices } from './regions.mjs';
import { DEFAULT_REGION } from './config.mjs';

test('every zone has a name and at least one region', () => {
  assert.ok(ZONES.length > 0);
  for (const zone of ZONES) {
    assert.ok(zone.name, 'zone missing name');
    assert.ok(zone.regions.length > 0, `${zone.name} has no regions`);
  }
});

test('every region has an id and a city label', () => {
  for (const zone of ZONES) {
    for (const region of zone.regions) {
      assert.match(region.id, /^[a-z]+-[a-z]+[0-9]+$/, `bad id ${region.id}`);
      assert.ok(region.city, `${region.id} missing city`);
    }
  }
});

test('region ids are unique across zones', () => {
  const ids = allRegions().map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a region id always matches the zone it is filed under', () => {
  for (const zone of ZONES) {
    for (const region of zone.regions) {
      assert.equal(zoneOf(region.id), zone.name, `${region.id} filed under ${zone.name}`);
    }
  }
});

test('the default region is supported', () => {
  assert.equal(isSupportedRegion(DEFAULT_REGION), true);
});

test('isSupportedRegion rejects unknown, empty and multi-region values', () => {
  assert.equal(isSupportedRegion('us-central11'), false);
  assert.equal(isSupportedRegion(''), false);
  assert.equal(isSupportedRegion(undefined), false);
  // eur3 and nam5 are Firestore multi-regions; Cloud Functions has no equivalent.
  assert.equal(isSupportedRegion('eur3'), false);
  assert.equal(isSupportedRegion('nam5'), false);
});

test('excludes regions where Cloud Functions gen 2 is unavailable', () => {
  for (const id of ['asia-southeast3', 'europe-north2', 'northamerica-south1']) {
    assert.equal(isSupportedRegion(id), false, `${id} should be excluded`);
  }
});

test('includes regions where all three services exist', () => {
  for (const id of ['europe-west6', 'us-central1', 'asia-northeast1', 'australia-southeast1']) {
    assert.equal(isSupportedRegion(id), true, `${id} should be supported`);
  }
});

test('toZoneChoices lists every zone with its region count', () => {
  const choices = toZoneChoices();
  assert.equal(choices.length, ZONES.length);
  assert.equal(choices[0].value, ZONES[0].name);
  assert.match(choices[0].name, /\(\d+ regions?\)/);
});

test('toRegionChoices labels a region with its city', () => {
  const choice = toRegionChoices('Europe').find(c => c.value === 'europe-west6');
  assert.equal(choice.name, 'europe-west6 (Zurich)');
});

test('toRegionChoices returns empty for an unknown zone', () => {
  assert.deepEqual(toRegionChoices('Atlantis'), []);
});

test('zoneOf returns null for an unsupported region', () => {
  assert.equal(zoneOf('nowhere-west1'), null);
});
