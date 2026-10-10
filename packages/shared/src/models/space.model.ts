import type { Locale } from './locale.model.js';
import type { Timestamp } from './timestamp.js';

export interface Space {
  id: string;
  /** Firestore id of a space imported from Firebase, for display. Only the public API accepts it in URLs. */
  legacyId?: string;
  /** Set while an import from Firebase fills the space (`IMPORTING`) or after it failed (`FAILED`). */
  importStatus?: 'IMPORTING' | 'FAILED';
  name: string;
  /** The space's locales, in the order users gave them. */
  locales: Locale[];
  /**
   * New translations are created in it and content stores its values in the bare field; a locale with
   * no value falls back to it.
   */
  defaultLocale: Locale;
  /** Preview environments for the Visual Editor (http(s) URLs only), in the order users gave them; the first is the default. */
  environments: SpaceEnvironment[];
  // timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  id: string;
  /** Names may repeat; the id tells environments apart. */
  name: string;
  url: string;
}

/** Creating or editing an environment. */
export interface SpaceEnvironmentInput {
  name: string;
  url: string;
}

// App API requests
export interface SpaceCreate {
  name: string;
}

export interface SpaceUpdate {
  name: string;
}

/** Dashboard numbers, computed on request (`GET /api/app/spaces/:id/overview`). */
export interface SpaceOverview {
  counts: {
    locales: number;
    /** Translation keys. */
    translations: number;
    /** Asset files (folders not counted). */
    assets: number;
    /** Content documents (folders not counted). */
    contents: number;
    schemas: number;
  };
  storage: {
    /** Bytes: the sum of the asset files' recorded sizes. */
    assets: number;
    /** Asset files with no recorded size (imported without their file); not in `assets`. */
    assetsWithoutSize: number;
  };
  progress: {
    /** Translation keys, the 100% of every locale. */
    total: number;
    /** The space's locales in their order, with how many keys have a non-empty value. */
    locales: (Locale & { translated: number })[];
  };
}
