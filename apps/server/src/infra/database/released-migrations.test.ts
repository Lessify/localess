import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const SERVER = resolve(import.meta.dirname, '../../..');
const DRIZZLE = join(SERVER, 'drizzle');
const RELEASE_SCRIPT = join(SERVER, 'scripts', 'db-release.mjs');

interface Released {
  migrations: Record<string, string>;
}

/** The hash `db:release` records: SHA-256 of the SQL, line endings normalised. */
function hashOf(dir: string, tag: string): string {
  const sql = readFileSync(join(dir, `${tag}.sql`), 'utf8').replace(/\r\n/g, '\n');
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

/** What is wrong with the released migrations of a drizzle directory: none when every one is as it shipped. */
function releasedProblems(dir: string): string[] {
  const journal = (JSON.parse(readFileSync(join(dir, 'meta', '_journal.json'), 'utf8')) as { entries: { tag: string }[] }).entries.map(
    it => it.tag,
  );
  const released = Object.entries((JSON.parse(readFileSync(join(dir, 'released.json'), 'utf8')) as Released).migrations);
  const problems: string[] = [];
  released.forEach(([tag, hash], index) => {
    if (!journal.includes(tag)) problems.push(`${tag}: released, but no longer in meta/_journal.json`);
    else if (journal[index] !== tag) problems.push(`${tag}: released as migration ${index + 1}, now ${journal.indexOf(tag) + 1}`);
    else if (hashOf(dir, tag) !== hash) problems.push(`${tag}.sql: changed since it was released (put the change in a new migration)`);
  });
  return problems;
}

describe('released migrations', () => {
  it('are unchanged, in the journal, in the order they shipped', () => {
    expect(releasedProblems(DRIZZLE)).toEqual([]);
  });

  describe('the check and db:release, on a copy of drizzle/', () => {
    let dir = '';
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    function copy(): string {
      dir = mkdtempSync(join(tmpdir(), 'released-migrations-'));
      cpSync(DRIZZLE, dir, { recursive: true });
      writeFileSync(join(dir, 'released.json'), JSON.stringify({ migrations: {} }));
      return dir;
    }
    const release = (at: string) => execFileSync(process.execPath, [RELEASE_SCRIPT, at], { encoding: 'utf8', stdio: 'pipe' });
    const released = (at: string) => (JSON.parse(readFileSync(join(at, 'released.json'), 'utf8')) as Released).migrations;

    it('db:release records every migration of the journal, which the check then accepts', () => {
      const at = copy();
      release(at);
      expect(Object.keys(released(at))).toEqual(['0000_init', '0001_locales', '0002_integration_settings']);
      expect(releasedProblems(at)).toEqual([]);
    });

    it('a released migration edited afterwards is reported, and db:release refuses it', () => {
      const at = copy();
      release(at);
      writeFileSync(join(at, '0001_locales.sql'), `${readFileSync(join(at, '0001_locales.sql'), 'utf8')}\n-- edited`);
      expect(releasedProblems(at)).toEqual(['0001_locales.sql: changed since it was released (put the change in a new migration)']);
      expect(() => release(at)).toThrow(/0001_locales\.sql changed since it was released/);
    });

    it('only line endings changed (a Windows checkout) is not a change', () => {
      const at = copy();
      release(at);
      const file = join(at, '0000_init.sql');
      writeFileSync(file, readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
      expect(releasedProblems(at)).toEqual([]);
    });

    it('a released migration removed from the journal, or moved in it, is reported', () => {
      const at = copy();
      release(at);
      const journalFile = join(at, 'meta', '_journal.json');
      const journal = JSON.parse(readFileSync(journalFile, 'utf8')) as { entries: { tag: string }[] };
      writeFileSync(journalFile, JSON.stringify({ ...journal, entries: [...journal.entries].reverse() }));
      expect(releasedProblems(at)).toEqual([
        '0000_init: released as migration 1, now 3',
        '0002_integration_settings: released as migration 3, now 1',
      ]);
      writeFileSync(journalFile, JSON.stringify({ ...journal, entries: journal.entries.slice(1) }));
      expect(releasedProblems(at)).toContain('0000_init: released, but no longer in meta/_journal.json');
    });
  });
});
