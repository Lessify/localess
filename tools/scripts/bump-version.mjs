#!/usr/bin/env node
/**
 * Usage:
 *   node tools/scripts/bump-version.mjs [major|minor|patch]
 *
 * Bumps the version in:
 *   - package.json and every workspace package.json (apps/*, packages/*)
 *   - apps/web/src/environments/environment.ts
 *   - apps/web/src/environments/environment.prod.ts
 *   - apps/server/src/modules/schemas/open-api.service.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const BUMP_TYPE = process.argv[2];
if (!['major', 'minor', 'patch'].includes(BUMP_TYPE)) {
  console.error('Usage: node tools/scripts/bump-version.mjs [major|minor|patch]');
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

// Workspace package.json files
for (const group of ['apps', 'packages']) {
  for (const name of readdirSync(resolve(ROOT, group))) {
    const workspacePkgPath = resolve(ROOT, group, name, 'package.json');
    let workspacePkg;
    try {
      workspacePkg = JSON.parse(readFileSync(workspacePkgPath, 'utf8'));
    } catch {
      continue;
    }
    workspacePkg.version = newVersion;
    writeFileSync(workspacePkgPath, JSON.stringify(workspacePkg, null, 2) + '\n', 'utf8');
    console.log(`  Updated ${group}/${name}/package.json`);
  }
}

// Angular environment files — match:  version: '3.1.0',
const versionLinePattern = new RegExp(`(version:\\s*')[^']+(')`, 'g');
const versionLineReplacement = `$1${newVersion}$2`;

for (const rel of [
  'apps/web/src/environments/environment.ts',
  'apps/web/src/environments/environment.prod.ts',
]) {
  replaceInFile(resolve(ROOT, rel), versionLinePattern, versionLineReplacement);
}

// open-api.service.ts — match the single `version: '4.1.0'` app-version line
replaceInFile(
  resolve(ROOT, 'apps/server/src/modules/schemas/open-api.service.ts'),
  versionLinePattern,
  versionLineReplacement
);

console.log(`\nDone. New version: ${newVersion}`);
