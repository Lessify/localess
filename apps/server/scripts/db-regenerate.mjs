// Regenerates the migrations in place (until the first release, the schema is one migration plus the locales seed):
// 0000_init.sql from src/infra/database/schema.ts, then 0001_locales.sql as a drizzle custom migration with the same
// seed it had. Both are applied on every boot like any migration; local `.data` must be recreated afterwards.
// Usage: pnpm --filter @localess/server db:regenerate
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'drizzle');
const seedFile = join(out, '0001_locales.sql');

if (!existsSync(seedFile)) throw new Error(`${seedFile} is missing: it holds the locales seed and is kept as it is`);
const seed = readFileSync(seedFile, 'utf8');

const drizzleKit = args => execFileSync('drizzle-kit', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

rmSync(join(out, '0000_init.sql'), { force: true });
rmSync(seedFile, { force: true });
rmSync(join(out, 'meta'), { recursive: true, force: true });
drizzleKit(['generate', '--name', 'init']);
drizzleKit(['generate', '--custom', '--name', 'locales']);
writeFileSync(seedFile, seed);
console.log('Regenerated drizzle/0000_init.sql and drizzle/0001_locales.sql (seed kept). Recreate local .data.');
