import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';

/** How an item changed the product. Drives the badge shown next to the item title. */
export type WhatsNewLabel = 'new' | 'improved' | 'fixed';

/**
 * Badge colour per label, kept beside the type so a new label cannot be added without choosing one.
 * The badge variants carry no semantic green or amber, so the tone is applied on top of `outline`,
 * and every colour is paired with a `dark:` value to survive theme changes.
 *
 * The `!` matters: `.spartan-badge-variant-outline` sets `color` and `border-color`, and it ships
 * unlayered (inside `@scope (.style-nova)`), so it outranks everything in `@layer utilities` no
 * matter how specific. Without the important modifier these badges render plain grey.
 */
export const WHATS_NEW_LABEL_CLASS: Record<WhatsNewLabel, string> = {
  new: 'border-green-600/30! text-green-700! dark:border-green-400/30! dark:text-green-400!',
  improved: 'border-blue-600/30! text-blue-700! dark:border-blue-400/30! dark:text-blue-400!',
  fixed: 'border-amber-600/30! text-amber-700! dark:border-amber-400/30! dark:text-amber-400!',
};

/**
 * One story inside a release. Items are themed rather than one-per-commit: a release lands as a
 * handful of stories a user recognises, not as the change log of the repository.
 */
export interface WhatsNewItem {
  label: WhatsNewLabel;
  title: string;
  description: string;
}

/**
 * Everything that shipped in one version. Version and date live here rather than on each item, so
 * a release reads as a single block instead of repeating itself once per story.
 */
export interface WhatsNewRelease {
  /** Semantic version, e.g. `4.0.0`. */
  version: string;
  /** Release date as `YYYY-MM-DD`. Parsed as a local date, so no timezone shifts the day. */
  date: string;
  /** One or two sentences framing the release, shown above the items. */
  description: string;
  /** Ordered by how much each story changes day-to-day work, not by label. */
  items: WhatsNewItem[];
}

/**
 * Whether `version` sits after `than` in release order. Compares the dot-separated parts as
 * numbers rather than as text - `'3.10.0' > '3.9.0'` is false when compared as strings, which is
 * how an upgrade notice ends up pointing backwards.
 *
 * An empty `than` is treated as "nothing seen yet", so a first-time user is told about the notes.
 */
export function isVersionNewer(version: string, than: string): boolean {
  if (than === '') return true;
  const left = version.split('.').map(Number);
  const right = than.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

/**
 * Whether `version` is `minimum` or anything after it.
 *
 * The shape is checked first because `isVersionNewer` parses with `Number`, and anything it cannot
 * read becomes `NaN` - every comparison against which is false, so a tag like `v3.2.0` would come
 * back as "not older" and pass a floor it is nowhere near. Only plain dotted digits count, which
 * also keeps a `4.0.0-rc1` out of a check that exists to decide what users are offered.
 *
 * Past the shape it is expressed as "minimum is not newer" rather than an equality plus a
 * comparison, so versions written to different depths still line up - `4.0` is not textually
 * `4.0.0`, but neither is newer than the other.
 */
export function isVersionAtLeast(version: string, minimum: string): boolean {
  if (!/^\d+(\.\d+)*$/.test(version)) return false;
  return !isVersionNewer(minimum, version);
}

/** Wide enough for prose, matching the other content-heavy dialogs. */
export const WHATS_NEW_DIALOG_CONTENT_CLASS = DIALOG_WIDTH_SM;
