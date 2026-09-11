/**
 * The bridge from `.env.<project-id>` to the Angular bundle.
 *
 * Values are inlined at build time by esbuild's `define`, exposed by
 * `@angular/build:application` as the `define` builder option and by the CLI as a
 * repeatable `--define KEY=value` flag. Defaults for the same keys live in angular.json's
 * production configuration, so `npm run build:prod` works with no arguments; what this
 * module produces are per-project overrides.
 *
 * esbuild replaces the *identifier*, so a constant that is never defined is a runtime
 * ReferenceError rather than `undefined`. Every key is therefore always emitted.
 */
import { DEFAULT_REGION } from './config.mjs';

/** Every build constant, with the value used when the project config does not set it. */
export const BUILD_CONSTANTS = {
  LOCALESS_REGION: DEFAULT_REGION,
  LOCALESS_AUTH_CUSTOM_DOMAIN: '',
  LOCALESS_AUTH_PROVIDERS: '',
  LOCALESS_LOGIN_MESSAGE: '',
  LOCALESS_UNSPLASH_ENABLE: '',
};

/** Project config on top of the defaults, restricted to the known constants. */
export function resolveConstants(config = {}) {
  const resolved = {};
  for (const [key, fallback] of Object.entries(BUILD_CONSTANTS)) {
    const value = config[key];
    resolved[key] = value === undefined || value === '' ? fallback : value;
  }
  return resolved;
}

/**
 * `--define` argv for `ng build`. A define value is a JavaScript *expression*, so a string
 * needs quotes inside it - `JSON.stringify` produces exactly that, and escapes any quote
 * or newline a login message might contain.
 *
 * Those quotes are load-bearing and fragile: they only survive if the caller spawns the
 * build without a shell, because a shell strips them and esbuild then rejects the value as
 * "not a JS literal". `deploy.mjs` runs the Angular CLI directly for exactly this reason.
 */
export function toDefineArgs(config = {}) {
  return Object.entries(resolveConstants(config)).flatMap(([key, value]) => ['--define', `${key}=${JSON.stringify(value)}`]);
}
