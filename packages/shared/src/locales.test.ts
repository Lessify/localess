import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AVAILABLE_LOCALES } from './locales.js';

/**
 * The Google locale lists used to exist twice (server and UI) with a parity test between them. They
 * are defined once now; what is left to guard is the shape of the lists themselves.
 */
describe('Google locale lists', () => {
  /**
   * Pulls the quoted codes out of `const <listName> = [...]`, ignoring the surrounding prose.
   *
   * Anchored on the `=` rather than on the first `[`: the empty lists are annotated `string[]`, and
   * that bracket pair would otherwise be read as the literal, making every list parse as empty.
   */
  function codesOf(source: string, listName: string): string[] {
    const match = new RegExp(`const ${listName}[^=]*=\\s*\\[([^\\]]*)]`).exec(source);
    expect(match, `${listName} is declared as an array literal`).not.toBeNull();
    return (match![1].match(/'[^']*'/g) ?? []).map(it => it.replaceAll("'", ''));
  }

  const source = () => readFile(join(import.meta.dirname, 'locales.ts'), 'utf8');

  // A code in both one-way lists would be bidirectional written the long way, and would make the
  // two derived sets agree for the wrong reason.
  it('keeps the one-way lists disjoint from each other and from the bidirectional one', async () => {
    const text = await source();
    const bidirectional = codesOf(text, 'GCP_BIDIRECTIONAL_LOCALES');
    const sourceOnly = codesOf(text, 'GCP_SOURCE_ONLY_LOCALES');
    const targetOnly = codesOf(text, 'GCP_TARGET_ONLY_LOCALES');

    expect(bidirectional.length).toBeGreaterThan(100);
    expect(sourceOnly.filter(it => targetOnly.includes(it))).toEqual([]);
    expect([...sourceOnly, ...targetOnly].filter(it => bidirectional.includes(it))).toEqual([]);
  });

  it('has no duplicates in the bidirectional list', async () => {
    const codes = codesOf(await source(), 'GCP_BIDIRECTIONAL_LOCALES');

    expect(codes).toEqual([...new Set(codes)]);
  });
});

describe('AVAILABLE_LOCALES', () => {
  it('has unique ids', () => {
    const ids = AVAILABLE_LOCALES.map(it => it.id);

    expect(ids).toEqual([...new Set(ids)]);
  });
});
