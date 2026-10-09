/*
 * Cache lifetimes of the public API, unchanged from functions/src/config.ts (see docs/cdn-caching.md).
 * There is no Firebase Hosting CDN in front any more; these headers are what lets a CDN or reverse
 * proxy placed in front of Localess cache the same way.
 */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const TEN_MINUTES = 10 * MINUTE;
export const CACHE_MAX_AGE = DAY * 7;
export const CACHE_SHARE_MAX_AGE = DAY * 7;
export const CACHE_ASSET_NOT_FOUND_MAX_AGE = DAY * 7;
export const CACHE_ASSET_MAX_AGE = DAY * 365;
export const CACHE_REDIRECT_MAX_AGE_DEFAULT = MINUTE;
export const CACHE_BAD_REQUEST_MAX_AGE = HOUR;

export const publicCache = (seconds: number, shared = seconds) => `public, max-age=${seconds}, s-maxage=${shared}`;
