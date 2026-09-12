import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Packages that are expensive to `require` and are only needed by a subset of requests.
 *
 * Firebase loads the whole of `index.js` on every cold start of *every* function in the
 * codebase, so a single top-level `import` of one of these makes the public CDN function
 * pay for a video transcoder it will never call. Measured cost of loading all seven is
 * ~350ms of a ~445ms cold start.
 *
 * These must be reached through a lazy `await import(...)` at the call site instead — see
 * `utils/lazy-modules.ts`. Type-only usage is fine as long as it is an explicit
 * `import type`, which erases at compile time.
 */
const LAZY_ONLY_PACKAGES = [
  'sharp',
  'exiftool-vendored',
  'fluent-ffmpeg',
  'archiver',
  'unzipper',
  '@google-cloud/translate',
  'deepl-node',
];

const SRC = path.join(__dirname);

/** A single import/re-export edge out of a module. */
interface ImportEdge {
  specifier: string;
  /** `import type` / `export type` erase at compile time and cost nothing at runtime. */
  typeOnly: boolean;
}

/**
 * Import and re-export edges declared by a TypeScript source file.
 *
 * Deliberately a regex over source text rather than a real parse: the goal is to catch a
 * top-level `import x from 'sharp'` being reintroduced, and that is a lexical property of
 * the file. Dynamic `await import(...)` is not matched, which is exactly the point — it is
 * the form this test wants people to use.
 * @param {string} source TypeScript source text
 * @return {ImportEdge[]} every statically-loaded specifier in the file
 */
function parseImportEdges(source: string): ImportEdge[] {
  // `import ... from 'x'`, `export ... from 'x'`, and bare `import 'x'`.
  const pattern = /^[ \t]*(?:import|export)\s+(type\s+)?(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
  const edges: ImportEdge[] = [];
  for (const match of source.matchAll(pattern)) {
    edges.push({ typeOnly: match[1] !== undefined, specifier: match[2] });
  }
  return edges;
}

/**
 * Resolve a relative specifier to a file on disk, mirroring Node's directory-index rule.
 * @param {string} fromFile File containing the import
 * @param {string} specifier The relative specifier
 * @return {string | undefined} the resolved path, or undefined if it is not a source file
 */
function resolveRelative(fromFile: string, specifier: string): string | undefined {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Walk the statically-loaded module graph from an entry point.
 *
 * Returns every bare (non-relative) package specifier that is reached through a chain of
 * value imports — i.e. everything Node will actually `require` at cold start.
 * @param {string} entry Absolute path of the entry module
 * @return {Map<string, string[]>} package specifier to the chain of files that reaches it
 */
function eagerPackages(entry: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const visited = new Set<string>();

  const walk = (file: string, trail: string[]): void => {
    if (visited.has(file)) return;
    visited.add(file);
    const here = [...trail, path.relative(SRC, file)];

    for (const { specifier, typeOnly } of parseImportEdges(fs.readFileSync(file, 'utf8'))) {
      if (typeOnly) continue;
      if (specifier.startsWith('.')) {
        const resolved = resolveRelative(file, specifier);
        if (resolved) walk(resolved, here);
      } else if (!found.has(specifier)) {
        found.set(specifier, here);
      }
    }
  };

  walk(entry, []);
  return found;
}

describe('cold-start import graph', () => {
  const eager = eagerPackages(path.join(SRC, 'index.ts'));

  it.each(LAZY_ONLY_PACKAGES)('does not eagerly load %s from index.ts', pkg => {
    const offender = [...eager.entries()].find(([specifier]) => specifier === pkg || specifier.startsWith(`${pkg}/`));
    expect(offender, offender && `reached via: ${offender[1].join(' -> ')}`).toBeUndefined();
  });
});
