#!/usr/bin/env node
/**
 * Postinstall guard. See `scripts/setup/placeholder.mjs`.
 *
 * Runs before `set-env` in the `postinstall` chain so a fresh clone can build.
 */
import { resolve } from 'node:path';

import { ensureFirebaseConfig } from './setup/placeholder.mjs';

if (ensureFirebaseConfig(resolve(import.meta.dirname, '..'))) {
  console.log('CREATE src/environments/firebase-config.json (placeholder - run `npm run deploy` to fetch the real one)');
}
