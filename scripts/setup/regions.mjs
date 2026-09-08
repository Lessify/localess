/**
 * Regions where Firestore, Cloud Storage and Cloud Functions (gen 2) are ALL available.
 *
 * Localess uses gen-2 triggers, which must be co-located with the resources they listen
 * to, so a region is only offered when all three services exist there. Cloud Storage
 * covers every GCP region, which makes this the intersection of Firestore locations and
 * Cloud Functions gen-2 regions.
 *
 * Deliberately a static list rather than a live lookup: it has to render before any API
 * is enabled on a brand-new project, and a curated list keeps setup working offline and
 * fast. Regenerate it when Google adds a region by intersecting
 * `firebase firestore:locations --project <id>` with the gen-2 region list in
 * firebase-tools `lib/deploy/functions/pricing.js` (`V2_REGION_TO_TIER`).
 *
 * Excludes the Firestore multi-regions `eur3` and `nam5` - Cloud Functions has no
 * multi-region equivalent to pair them with. Last verified 2026-09-08.
 */
export const ZONES = [
  {
    name: 'Europe',
    regions: [
      { id: 'europe-central2', city: 'Warsaw' },
      { id: 'europe-north1', city: 'Finland' },
      { id: 'europe-southwest1', city: 'Madrid' },
      { id: 'europe-west1', city: 'Belgium' },
      { id: 'europe-west10', city: 'Berlin' },
      { id: 'europe-west12', city: 'Turin' },
      { id: 'europe-west2', city: 'London' },
      { id: 'europe-west3', city: 'Frankfurt' },
      { id: 'europe-west4', city: 'Netherlands' },
      { id: 'europe-west6', city: 'Zurich' },
      { id: 'europe-west8', city: 'Milan' },
      { id: 'europe-west9', city: 'Paris' },
    ],
  },
  {
    name: 'United States',
    regions: [
      { id: 'us-central1', city: 'Iowa' },
      { id: 'us-east1', city: 'South Carolina' },
      { id: 'us-east4', city: 'Northern Virginia' },
      { id: 'us-east5', city: 'Columbus' },
      { id: 'us-south1', city: 'Dallas' },
      { id: 'us-west1', city: 'Oregon' },
      { id: 'us-west2', city: 'Los Angeles' },
      { id: 'us-west3', city: 'Salt Lake City' },
      { id: 'us-west4', city: 'Las Vegas' },
    ],
  },
  {
    name: 'North America',
    regions: [
      { id: 'northamerica-northeast1', city: 'Montréal' },
      { id: 'northamerica-northeast2', city: 'Toronto' },
    ],
  },
  {
    name: 'South America',
    regions: [
      { id: 'southamerica-east1', city: 'São Paulo' },
      { id: 'southamerica-west1', city: 'Santiago' },
    ],
  },
  {
    name: 'Asia',
    regions: [
      { id: 'asia-east1', city: 'Taiwan' },
      { id: 'asia-east2', city: 'Hong Kong' },
      { id: 'asia-northeast1', city: 'Tokyo' },
      { id: 'asia-northeast2', city: 'Osaka' },
      { id: 'asia-northeast3', city: 'Seoul' },
      { id: 'asia-south1', city: 'Mumbai' },
      { id: 'asia-south2', city: 'Delhi' },
      { id: 'asia-southeast1', city: 'Singapore' },
      { id: 'asia-southeast2', city: 'Jakarta' },
    ],
  },
  {
    name: 'Australia',
    regions: [
      { id: 'australia-southeast1', city: 'Sydney' },
      { id: 'australia-southeast2', city: 'Melbourne' },
    ],
  },
  {
    name: 'Middle East',
    regions: [
      { id: 'me-central1', city: 'Doha' },
      { id: 'me-central2', city: 'Dammam' },
      { id: 'me-west1', city: 'Tel Aviv' },
    ],
  },
  {
    name: 'Africa',
    regions: [
      { id: 'africa-south1', city: 'Johannesburg' },
    ],
  },
];

/** Flat list of every supported region, in zone order. */
export function allRegions() {
  return ZONES.flatMap(zone => zone.regions);
}

export function isSupportedRegion(region) {
  return allRegions().some(entry => entry.id === region);
}

/** The zone name a region belongs to, or null when it is not supported. */
export function zoneOf(region) {
  return ZONES.find(zone => zone.regions.some(entry => entry.id === region))?.name ?? null;
}

export function toZoneChoices() {
  return ZONES.map(zone => ({
    name: `${zone.name} (${zone.regions.length} region${zone.regions.length === 1 ? '' : 's'})`,
    value: zone.name,
  }));
}

export function toRegionChoices(zoneName) {
  const zone = ZONES.find(entry => entry.name === zoneName);
  if (!zone) return [];
  return zone.regions.map(region => ({ name: `${region.id} (${region.city})`, value: region.id }));
}
