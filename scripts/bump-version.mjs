#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/bump-version.mjs [major|minor|patch]
 *
 * Bumps the version in:
 *   - package.json
 *   - functions/package.json
 *   - src/environments/environment.ts
 *   - src/environments/environment.prod.ts
 *   - src/environments/environment.docker.ts
 *   - functions/src/services/open-api.service.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BUMP_TYPE = process.argv[2];
if (!['major', 'minor', 'patch'].includes(BUMP_TYPE)) {
  console.error('Usage: node scripts/bump-version.mjs [major|minor|patch]');
  process.exit(1);
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function replaceInFile(filePath, pattern, replacement) {
  const content = readFileSync(filePath, 'utf8');
  const updated = content.replace(pattern, replacement);
  if (updated === content) {
    console.warn(`  [WARN] No change made in ${filePath} — pattern not matched`);
    return;
  }
  writeFileSync(filePath, updated, 'utf8');
  console.log(`  Updated ${filePath}`);
}

// Read current version from package.json
const pkgPath = resolve(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, BUMP_TYPE);

console.log(`Bumping ${BUMP_TYPE}: ${oldVersion} → ${newVersion}\n`);

// package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`  Updated package.json`);

// functions/package.json
const fnPkgPath = resolve(ROOT, 'functions/package.json');
const fnPkg = JSON.parse(readFileSync(fnPkgPath, 'utf8'));
fnPkg.version = newVersion;
writeFileSync(fnPkgPath, JSON.stringify(fnPkg, null, 2) + '\n', 'utf8');
console.log(`  Updated functions/package.json`);

// Angular environment files — match:  version: '3.1.0',
const versionLinePattern = new RegExp(`(version:\\s*')[^']+(')`, 'g');
const versionLineReplacement = `$1${newVersion}$2`;

for (const rel of [
  'src/environments/environment.ts',
  'src/environments/environment.prod.ts',
  'src/environments/environment.docker.ts',
]) {
  replaceInFile(resolve(ROOT, rel), versionLinePattern, versionLineReplacement);
}

// open-api.service.ts — match the single `version: '3.1.0'` app-version line (line 366)
replaceInFile(
  resolve(ROOT, 'functions/src/services/open-api.service.ts'),
  versionLinePattern,
  versionLineReplacement
);

console.log(`\nDone. New version: ${newVersion}`);
