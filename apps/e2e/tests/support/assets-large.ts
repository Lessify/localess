/**
 * What the "Assets (large)" test template (`ASSETS_LARGE`) holds, restated from its rule
 * (docs/roadmap/assets-template.md), not imported from the server. Nothing published; ids differ per run.
 */
export const LARGE_ASSETS = {
  template: 'ASSETS_LARGE',
  files: 1_000,
  images: 100,
  pageSize: 20,
} as const;

/** `file-0042` style name of file N. */
export const bulkName = (n: number): string => `file-${String(n).padStart(4, '0')}`;

/** The name the list shows for file N: every 10th is a PNG, the others text. */
export const bulkListed = (n: number): string => `${bulkName(n)}${n % 10 === 0 ? '.png' : '.txt'}`;

/** Files `from` … `to`, as listed. */
export const bulkRange = (from: number, to: number): string[] => Array.from({ length: to - from + 1 }, (_, i) => bulkListed(from + i));
