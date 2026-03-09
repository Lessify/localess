import { writeFileSync } from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Get GITHUB_SHA from environment variable (provided by GitHub Actions)
const gitCommitSha = process.env.COMMIT_SHA || process.env.GITHUB_SHA || 'local-build';

const versionInfo = {
  version: packageJson.version,
  gitCommitSha: gitCommitSha,
  buildDate: new Date().toISOString(),
};

// Write version.json to the public directory so it's included in the build
writeFileSync(
  join(__dirname, '../src/assets/version.json'),
  JSON.stringify(versionInfo, null, 2)
);

console.log('Generated version.json:', versionInfo);
