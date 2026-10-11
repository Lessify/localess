/** Escapes `\`, `%` and `_` so `value` matches literally in a `LIKE` pattern. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, m => `\\${m}`);
