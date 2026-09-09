/**
 * How a Firebase project is recognised as one Localess manages.
 *
 * Two independent signals, because neither alone is sufficient:
 *
 *   - A GCP project label. Authoritative and survives a fresh clone, but only
 *     present on projects provisioned since this marker existed.
 *   - A web app named `Localess`. A weak fallback - setup only names an app when it
 *     creates one, so a project that already had a web app never gets it.
 *
 * Local `.env.<project-id>` config is the third signal, but it lives on one machine and
 * can be stale, which is why it is always cross-checked against the two above.
 *
 * Labels are used rather than something bespoke because Firebase already labels its own
 * projects (`firebase: enabled`), so this stays idiomatic and visible in the console.
 */

export const MANAGED_LABEL = 'localess-managed';
export const VERSION_LABEL = 'localess-version';
export const REGION_LABEL = 'localess-region';

/** The display name setup gives a web app it creates. Also the weak fallback marker. */
export const WEB_APP_NAME = 'Localess';

const MAX_LABEL_LENGTH = 63;

/** GCP label values allow lowercase letters, digits, hyphens and underscores only. */
export function toLabelValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LABEL_LENGTH);
}

/**
 * The labels that mark a project as Localess.
 *
 * `region` is optional because markers written by earlier versions do not carry one. An
 * absent label means "unknown", never "the default" - the live Firestore location is the
 * authoritative answer, and guessing here would let a stale label masquerade as fact.
 */
export function buildMarkerLabels(version, region) {
  const labels = { [MANAGED_LABEL]: 'true', [VERSION_LABEL]: toLabelValue(version) };
  if (region) labels[REGION_LABEL] = toLabelValue(region);
  return labels;
}

export function hasMarker(labels) {
  return labels?.[MANAGED_LABEL] === 'true';
}

/** The version the marker recorded, back in dotted form, or null. */
export function markerVersion(labels) {
  const raw = labels?.[VERSION_LABEL];
  return raw ? raw.replace(/-/g, '.') : null;
}

/** The region the marker recorded, or null. Region ids are already label-safe. */
export function markerRegion(labels) {
  return labels?.[REGION_LABEL] ?? null;
}

/**
 * Turns the three signals into a picker annotation.
 *
 * `remote` is null when no lookup was attempted, and `{ reachable: false }` when one was
 * attempted and failed - those are different things, and the second is worth saying out
 * loud so a stale local config is never silently trusted.
 */
export function describeProject({ configuredLocally, remote }) {
  const parts = [];
  if (configuredLocally) parts.push('local config');

  if (remote && !remote.reachable) {
    parts.push('could not verify');
  } else if (remote?.reachable) {
    const version = markerVersion(remote.labels);
    const region = markerRegion(remote.labels);
    if (hasMarker(remote.labels)) {
      parts.push(version ? `Localess ${version}` : 'Localess');
      if (region) parts.push(region);
    } else if (remote.hasLocalessWebApp) {
      parts.push('Localess web app');
    } else if (configuredLocally) {
      parts.push('no Localess marker');
    }
  }

  const recognised = Boolean(remote?.reachable && (hasMarker(remote.labels) || remote.hasLocalessWebApp));
  return { note: parts.length > 0 ? parts.join(' · ') : undefined, priority: configuredLocally || recognised };
}
