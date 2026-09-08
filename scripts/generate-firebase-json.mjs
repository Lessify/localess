#!/usr/bin/env node
/**
 * Cloud Build entry point for `writeFirebaseJson`.
 *
 * Usage: node scripts/generate-firebase-json.mjs <project-id> [region]
 */
import { relative, resolve } from 'node:path';

import { DEFAULT_REGION } from './setup/config.mjs';
import { writeFirebaseJson } from './setup/generate.mjs';

const [projectId, region = DEFAULT_REGION] = process.argv.slice(2);

if (!projectId) {
  console.error('Usage: node scripts/generate-firebase-json.mjs <project-id> [region]');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
console.log(relative(root, writeFirebaseJson(root, projectId, region || DEFAULT_REGION)));
