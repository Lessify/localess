import type { FirebaseImport } from './firebase-import.model.js';
import type { Locale } from './locale.model.js';
import type { Timestamp } from './timestamp.js';

/**
 * A space: the columns of `spaces`, and its relations, each present when the endpoint loaded it (Admin → Spaces:
 * `firebaseImport`; the selected space: `defaultLocale` and `spaceLocales`). Environments have their own endpoint.
 */
export interface Space {
  id: string;
  name: string;
  /**
   * New translations are created in it and content stores its values in the bare field; a locale with
   * no value falls back to it.
   */
  defaultLocaleId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  defaultLocale?: Locale;
  /** The space's locales, in the order users gave them. */
  spaceLocales?: SpaceLocale[];
  /** Preview environments for the Visual Editor, in the order users gave them; the first is the default. */
  environments?: SpaceEnvironment[];
  /** The space's import from Firebase (one at most): its status and the Firestore id (`sourceSpaceId`). */
  firebaseImport?: FirebaseImport;
}

/** A locale of a space, in its position. */
export interface SpaceLocale {
  spaceId: string;
  localeId: string;
  position: number;
  createdAt: Timestamp;
  locale?: Locale;
  space?: Space;
}

/** A Visual Editor preview environment of a space (http(s) URLs only). */
export interface SpaceEnvironment {
  id: string;
  spaceId: string;
  /** Names may repeat; the id tells environments apart. */
  name: string;
  url: string;
  position: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  space?: Space;
}

// App API requests
/**
 * The templates a space can be created from, in the order the Create Space dialog lists them; the test-only ones
 * (`LOCALESS_TEST_TEMPLATES`) last. The server holds what each one creates, the web app its title, description and icon.
 */
export const SPACE_TEMPLATE_IDS = [
  'blog',
  'ecommerce',
  'marketing',
  'translations_large',
  'contents_fields',
  'assets_large',
  'contents_large',
] as const;

export type SpaceTemplateId = (typeof SPACE_TEMPLATE_IDS)[number];

/** The fields Admin → Spaces may sort by (`name`: case-insensitive). Request schemas: `space.zod.ts`. */
export const SPACE_SORT_FIELDS = ['name', 'id', 'updatedAt'] as const;
export type SpaceSortField = (typeof SPACE_SORT_FIELDS)[number];

/** The fields Space Settings → Locales may sort by (`position`: the space's order; `id` and `name`: its locale's). */
export const SPACE_LOCALE_SORT_FIELDS = ['position', 'id', 'name'] as const;
export type SpaceLocaleSortField = (typeof SPACE_LOCALE_SORT_FIELDS)[number];

/** The fields Space Settings → Visual Editor may sort by (`position`: the space's order, the first the default). */
export const SPACE_ENVIRONMENT_SORT_FIELDS = ['position', 'name', 'url'] as const;
export type SpaceEnvironmentSortField = (typeof SPACE_ENVIRONMENT_SORT_FIELDS)[number];

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
