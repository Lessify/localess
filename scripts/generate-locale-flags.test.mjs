import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { describe } from 'node:test';

import { collectFlags, FIXED_FLAGS, readLocaleIds, render, subtagsOf } from './generate-locale-flags.mjs';

const FLAGS_DIR = join('node_modules', 'circle-flags', 'flags');
const GENERATED = join('src', 'app', 'shared', 'components', 'locale-icon', 'locale-flags.ts');
const LOCALE_SERVICE = join('src', 'app', 'shared', 'services', 'locale.service.ts');

/**
 * The locale icon decides from these constants whether a flag exists, so a stale constant is not a
 * cosmetic problem: it points an `<img>` at an asset that was never copied, and behind the Firebase
 * Hosting SPA rewrite that serves `index.html` rather than a 404. These tests are what makes the
 * generated file trustworthy - re-run `node scripts/generate-locale-flags.mjs` when they fail.
 */
describe('locale flag data', () => {
  const version = JSON.parse(readFileSync(join('node_modules', 'circle-flags', 'package.json'), 'utf8')).version;
  const localeIds = readLocaleIds(readFileSync(LOCALE_SERVICE, 'utf8'));

  /**
   * Compared by content rather than byte-for-byte: `npm run lint:fix` reformats the generated file,
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
    const { languages, countries, identicalLocales } = collectFlags(localeIds);

    assert.deepEqual(codesOf('LANGUAGE_FLAGS'), languages, 'run: node scripts/generate-locale-flags.mjs');
    assert.deepEqual(codesOf('COUNTRY_FLAGS'), countries, 'run: node scripts/generate-locale-flags.mjs');
    assert.deepEqual(codesOf('IDENTICAL_FLAG_LOCALES'), identicalLocales, 'run: node scripts/generate-locale-flags.mjs');
  });

  // Upgrading the package without re-running the generator is the other way this file goes stale.
  test('the committed file names the installed package version', () => {
    assert.match(readFileSync(GENERATED, 'utf8'), new RegExp(`circle-flags ${version.replaceAll('.', '\\.')}\\.`));
  });

  // The renderer still has to produce something that parses as the three constants.
  test('renders the three constants', () => {
    const output = render({ languages: ['de'], countries: ['ch'], identicalLocales: ['de-DE'] }, version);

    assert.match(output, /export const LANGUAGE_FLAGS: ReadonlySet<string> = new Set\(\['de'\]\);/);
    assert.match(output, /export const COUNTRY_FLAGS: ReadonlySet<string> = new Set\(\['ch'\]\);/);
    assert.match(output, /export const IDENTICAL_FLAG_LOCALES: ReadonlySet<string> = new Set\(\['de-DE'\]\);/);
  });

  test('every flag the icon can ask for is present in the package', () => {
    const { languages, countries } = collectFlags(localeIds);
    const missing = [
      ...languages.map(code => join('language', `${code}.svg`)),
      ...countries.map(code => `${code}.svg`),
      ...FIXED_FLAGS,
    ].filter(file => !existsSync(join(FLAGS_DIR, file)));

    assert.deepEqual(missing, []);
  });

  // The generator only emits codes it found, so a broken regex would produce empty sets and every
  // locale would silently fall back to a text chip with nothing failing.
  test('the locale list is actually parsed', () => {
    assert.ok(localeIds.length > 400, `only ${localeIds.length} locale ids found`);
    assert.ok(localeIds.includes('de-CH'));
    assert.ok(localeIds.includes('it-CH'));

    const { languages, countries } = collectFlags(localeIds);

    assert.ok(languages.includes('de'));
    assert.ok(languages.includes('it'));
    assert.ok(countries.includes('ch'));
  });

  // The split icon exists for exactly this case: same country, different language.
  test('Swiss German and Swiss Italian resolve to different language halves', () => {
    const { identicalLocales } = collectFlags(localeIds);

    assert.deepEqual(subtagsOf('de-CH'), { language: 'de', region: 'ch' });
    assert.deepEqual(subtagsOf('it-CH'), { language: 'it', region: 'ch' });
    assert.ok(!identicalLocales.includes('de-CH'));
    assert.ok(!identicalLocales.includes('it-CH'));
  });

  // `Intl.Locale` must not be swapped for a split on '-': the script subtag sits in between.
  test('reads the region out of a locale that carries a script', () => {
    assert.deepEqual(subtagsOf('shi-Latn-MA'), { language: 'shi', region: 'ma' });
    assert.deepEqual(subtagsOf('zh-Hans'), { language: 'zh', region: undefined });
  });

  /**
   * The collapse list is compared by file content on purpose. `gb.svg` and `uk.svg` are the same
   * bytes, so matching English to "its" country by name picked `uk`, `en-GB` missed the collapse
   * and rendered two identical halves - which is how this test earned its place.
   */
  test('collapses locales whose two halves are the same picture', () => {
    const { identicalLocales } = collectFlags(localeIds);

    assert.ok(identicalLocales.includes('de-DE'));
    assert.ok(identicalLocales.includes('it-IT'));
    assert.ok(identicalLocales.includes('en-GB'));
    assert.ok(!identicalLocales.includes('en-US'), 'the English flag is the UK one, so en-US stays split');
  });
});
