import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { describe } from 'node:test';

import { collectFlags, FIXED_FLAGS, render } from './generate-locale-flags.mjs';

const FLAGS_DIR = join('apps', 'web', 'node_modules', 'circle-flags', 'flags');
const GENERATED = join('apps', 'web', 'src', 'app', 'shared', 'components', 'locale-icon', 'locale-flags.ts');

/**
 * The locale icon decides from these constants whether a flag exists, so a stale constant is not a
 * cosmetic problem: it points an `<img>` at an asset that was never copied, and behind the server's
 * SPA fallback that serves `index.html` rather than a 404. These tests are what makes the
 * generated file trustworthy - re-run `node tools/scripts/generate-locale-flags.mjs` when they fail.
 */
describe('locale flag data', () => {
  const version = JSON.parse(readFileSync(join('apps', 'web', 'node_modules', 'circle-flags', 'package.json'), 'utf8')).version;

  /**
   * Compared by content rather than byte-for-byte: `pnpm lint:fix` reformats the generated file,
   * so an exact text comparison failed on every lint run and said "regenerate" when nothing had
   * actually drifted.
   *
   * The regex is anchored on the `=` and not on the first `[`, because `ReadonlySet<string>` would
   * otherwise be read as an empty array literal and every list would compare equal no matter what
   * the file says.
   */
  test('the committed constants list what the installed package provides', () => {
    const source = readFileSync(GENERATED, 'utf8');
    const codesOf = name => {
      const match = new RegExp(`const ${name}[^=]*=[^[]*\\[([^\\]]*)]`).exec(source);
      assert.ok(match, `${name} is declared as a set literal`);
      return (match[1].match(/'[^']*'/g) ?? []).map(code => code.replaceAll("'", '')).sort();
    };
    const { languages, countries, identicalPairs } = collectFlags();

    assert.deepEqual(codesOf('LANGUAGE_FLAGS'), languages, 'run: node tools/scripts/generate-locale-flags.mjs');
    assert.deepEqual(codesOf('COUNTRY_FLAGS'), countries, 'run: node tools/scripts/generate-locale-flags.mjs');
    assert.deepEqual(codesOf('IDENTICAL_FLAG_PAIRS'), identicalPairs, 'run: node tools/scripts/generate-locale-flags.mjs');
  });

  // Upgrading the package without re-running the generator is the other way this file goes stale.
  test('the committed file names the installed package version', () => {
    assert.match(readFileSync(GENERATED, 'utf8'), new RegExp(`circle-flags ${version.replaceAll('.', '\\.')}\\.`));
  });

  // The renderer still has to produce something that parses as the three constants.
  test('renders the three constants', () => {
    const output = render({ languages: ['de'], countries: ['ch'], identicalPairs: ['de-de'] }, version);

    assert.match(output, /export const LANGUAGE_FLAGS: ReadonlySet<string> = new Set\(\['de'\]\);/);
    assert.match(output, /export const COUNTRY_FLAGS: ReadonlySet<string> = new Set\(\['ch'\]\);/);
    assert.match(output, /export const IDENTICAL_FLAG_PAIRS: ReadonlySet<string> = new Set\(\['de-de'\]\);/);
  });

  test('every flag the icon can ask for is present in the package', () => {
    const { languages, countries } = collectFlags();
    const missing = [
      ...languages.map(code => join('language', `${code}.svg`)),
      ...countries.map(code => `${code}.svg`),
      ...FIXED_FLAGS,
    ].filter(file => !existsSync(join(FLAGS_DIR, file)));

    assert.deepEqual(missing, []);
  });

  // The locale list lives in the database now, so every ISO region and every language flag is emitted.
  test('covers every language flag and every two-letter region of the package', () => {
    const { languages, countries } = collectFlags();

    assert.ok(languages.length > 150, `only ${languages.length} language flags found`);
    assert.ok(countries.length > 240, `only ${countries.length} region flags found`);
    assert.ok(languages.includes('de') && languages.includes('it'));
    assert.ok(countries.includes('ch') && countries.includes('aq'));
    assert.ok(countries.every(code => /^[a-z]{2}$/.test(code)), 'only ISO 3166 two-letter regions');
  });

  /**
   * The collapse list is compared by file content on purpose. `gb.svg` and `uk.svg` are the same
   * bytes, so matching English to "its" country by name picked `uk`, `en-GB` missed the collapse
   * and rendered two identical halves - which is how this test earned its place.
   */
  test('collapses language/region pairs whose two halves are the same picture', () => {
    const { identicalPairs } = collectFlags();

    assert.ok(identicalPairs.includes('de-de'));
    assert.ok(identicalPairs.includes('it-it'));
    assert.ok(identicalPairs.includes('en-gb'));
    assert.ok(!identicalPairs.includes('en-us'), 'the English flag is the UK one, so en-US stays split');
    // The split icon exists for exactly this case: same country, different language.
    assert.ok(!identicalPairs.includes('de-ch'));
    assert.ok(!identicalPairs.includes('it-ch'));
  });
});
