// Records the migrations a release ships in drizzle/released.json (each with the SHA-256 of its SQL), so they are
// never edited again: installs that applied them would not see the change. `src/infra/database/released-migrations.test.ts`
// checks the list on every test run; `db:regenerate` refuses once it has an entry. Run it when tagging a release.
// A migration already recorded must still match: an edited one fails here as in the test.
// Usage: pnpm --filter @localess/server db:release [drizzle directory]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle'));
const releasedFile = join(out, 'released.json');

/** The hash of a migration's SQL, line endings normalised (a Windows checkout has the same migration). */
const hashOf = tag =>
  `sha256:${createHash('sha256')
    .update(readFileSync(join(out, `${tag}.sql`), 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex')}`;

const journal = JSON.parse(readFileSync(join(out, 'meta', '_journal.json'), 'utf8'));
const released = JSON.parse(readFileSync(releasedFile, 'utf8'));

const migrations = {};
for (const { tag } of journal.entries) {
  const hash = hashOf(tag);
  const recorded = released.migrations[tag];
  if (recorded && recorded !== hash) throw new Error(`${tag}.sql changed since it was released: put the change in a new migration`);
  migrations[tag] = hash;
}
for (const tag of Object.keys(released.migrations)) {
  if (!(tag in migrations)) throw new Error(`${tag} was released but is no longer in meta/_journal.json`);
}

writeFileSync(releasedFile, `${JSON.stringify({ ...released, migrations }, null, 2)}\n`);
const added = Object.keys(migrations).filter(tag => !(tag in released.migrations));
console.log(added.length ? `Recorded as released: ${added.join(', ')}` : 'Nothing new: every migration was already recorded.');
