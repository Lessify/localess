/**
 * Console output shared by every command.
 *
 * The step counter is per-logger rather than module-global so two commands running in one
 * process - setup offering a deploy - each number their own steps from 1.
 */
import { relative, resolve } from 'node:path';

/** The repo root. This file lives at scripts/localess/log.mjs. */
export const ROOT = resolve(import.meta.dirname, '..', '..');

/** Paths are logged relative to the repo root - absolute ones are noise. */
export const rel = path => relative(ROOT, path);

export function createLogger() {
  let step = 0;
  return {
    step: msg => console.log(`\n\x1b[1m[${++step}] ${msg}\x1b[0m`),
    done: msg => console.log(`    \x1b[32m+\x1b[0m ${msg}`),
    skip: msg => console.log(`    \x1b[90m-\x1b[0m ${msg}`),
    warn: msg => console.log(`    \x1b[33m!\x1b[0m ${msg}`),
  };
}
