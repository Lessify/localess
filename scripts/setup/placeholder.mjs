/**
 * Fresh-clone guard for the two generated files the Angular build imports.
 *
 * `src/environments/firebase-config.json` and `src/environments/env.ts` are gitignored,
 * so a fresh clone has neither and every `environment.*.ts` fails to typecheck before a
 * deploy has ever run. Both are written with inert placeholder values on install; the
 * real SDK config is fetched from the live project by `npm run deploy`.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Same keys as `firebase apps:sdkconfig` emits, so the shape typechecks identically. */
const PLACEHOLDER_SDK_CONFIG = {
  projectId: '',
  appId: '',
  storageBucket: '',
  locationId: '',
  apiKey: '',
  authDomain: '',
  messagingSenderId: '',
  version: '2',
};

/** Writes the placeholder only when the file is absent. Returns true if it wrote. */
export function ensureFirebaseConfig(root) {
  const path = join(root, 'src', 'environments', 'firebase-config.json');
  if (existsSync(path)) return false;
  writeFileSync(path, `${JSON.stringify(PLACEHOLDER_SDK_CONFIG, null, 2)}\n`);
  return true;
}
