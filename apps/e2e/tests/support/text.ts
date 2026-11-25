/** `text` as a literal inside a RegExp (names with `.`, `(`, `+` ... match themselves only). */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches exactly `text`, ignoring the whitespace around it (`toHaveText` on a cell, a card). */
export function exactly(text: string | number): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(String(text))}\\s*$`);
}
