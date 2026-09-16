import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * The Google locale lists exist twice: here in `config.ts`, which validates every request, and in
 * the frontend's `locale.service.ts`, which decides what the UI offers. They are hand-copied, the
 * way the rest of the models are shared between the two sides of this repo.
 *
 * Drift is invisible until runtime and asymmetric in cost: a locale the UI offers but the backend
 * rejects fails only after the user has picked it, and a locale the backend accepts but the UI
 * hides is silently unavailable. This test reads both files as text - neither can be imported from
 * the other's build - and fails on the difference instead.
 */
describe('Google locale lists', () => {
  const LISTS = ['GCP_BIDIRECTIONAL_LOCALES', 'GCP_SOURCE_ONLY_LOCALES', 'GCP_TARGET_ONLY_LOCALES'];

  /**
   * Pulls the quoted codes out of `const <listName> = [...]`, ignoring the surrounding prose.
   *
   * Anchored on the `=` rather than on the first `[`: the empty lists are annotated `string[]`, and
   * that bracket pair would otherwise be read as the literal, making every list parse as empty and
   * the comparison pass no matter what the files say.
   */
  function codesOf(source: string, listName: string): string[] {
    const match = new RegExp(`const ${listName}[^=]*=\\s*\\[([^\\]]*)]`).exec(source);
    expect(match, `${listName} is declared as an array literal`).not.toBeNull();
    return (match![1].match(/'[^']*'/g) ?? []).map(it => it.replaceAll("'", ''));
  }

  async function sources(): Promise<[string, string]> {
    return await Promise.all([readFile('src/config.ts', 'utf8'), readFile('../src/app/shared/services/locale.service.ts', 'utf8')]);
  }

  for (const list of LISTS) {
    it(`${list} is identical on both sides`, async () => {
      const [functions, ui] = await sources();

      expect(codesOf(ui, list)).toEqual(codesOf(functions, list));
    });
  }

  // A code in both one-way lists would be bidirectional written the long way, and would make the
  // two derived sets agree for the wrong reason.
  it('keeps the one-way lists disjoint from each other and from the bidirectional one', async () => {
    const [functions] = await sources();
    const bidirectional = codesOf(functions, 'GCP_BIDIRECTIONAL_LOCALES');
    const sourceOnly = codesOf(functions, 'GCP_SOURCE_ONLY_LOCALES');
    const targetOnly = codesOf(functions, 'GCP_TARGET_ONLY_LOCALES');

    expect(sourceOnly.filter(it => targetOnly.includes(it))).toEqual([]);
    expect([...sourceOnly, ...targetOnly].filter(it => bidirectional.includes(it))).toEqual([]);
  });

  it('has no duplicates in the bidirectional list', async () => {
    const [functions] = await sources();
    const codes = codesOf(functions, 'GCP_BIDIRECTIONAL_LOCALES');

    expect(codes).toEqual([...new Set(codes)]);
  });
});
