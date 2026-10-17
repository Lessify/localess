/**
 * What the "Contents (large)" test template (`CONTENTS_LARGE`) holds, restated from its rule
 * (docs/roadmap/contents-large-template.md), not imported from the server. English only; nothing published.
 */
export const LARGE_CONTENTS = {
  template: 'CONTENTS_LARGE',
  documents: 2_000,
  folders: 67,
  archive: 1_000,
  postsPerMonth: 16,
  /** Documents under `blog/2024`: 12 months × 16 posts. */
  year: 192,
} as const;

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** `Doc 0042` style name of archive document N. */
export const docName = (n: number): string => `Doc ${pad(n, 4)}`;

/** Archive documents `from` … `to`, by name. */
export const docRange = (from: number, to: number): string[] => Array.from({ length: to - from + 1 }, (_, i) => docName(from + i));

/** `Post 2024-06-03` style name. */
export const postName = (year: number, month: number, n: number): string => `Post ${year}-${pad(month, 2)}-${pad(n, 2)}`;
