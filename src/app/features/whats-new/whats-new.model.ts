import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';

/**
 * One release-note item. Entries are themed rather than one-per-commit: a release lands as a
 * handful of stories a user recognises, not as the change log of the repository.
 */
export interface WhatsNewEntry {
  /** Semantic version the entry shipped in, e.g. `4.0.0`. Several entries share one version. */
  version: string;
  /** Release date as `YYYY-MM-DD`. Parsed as a local date, so no timezone shifts the day. */
  date: string;
  title: string;
  description: string;
}

/** Wide enough for prose, matching the other content-heavy dialogs. */
export const WHATS_NEW_DIALOG_CONTENT_CLASS = DIALOG_WIDTH_SM;
