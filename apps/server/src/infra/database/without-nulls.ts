/** Drops `null` columns, so rows look like the Firestore documents the ported helpers expect (absent, not null). */
export function withoutNulls<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;
}

/** `withoutNulls` for a picked set of columns, typed: each one optional and never `null`. */
export function present<T extends object>(columns: T): { [K in keyof T]?: NonNullable<T[K]> } {
  return withoutNulls(columns);
}

/*
 * Row → shared model mappers (`toTranslation`) rely on this: the shared models describe the JSON wire format, where
 * timestamps are ISO strings; rows carry `Date`, which serialises to exactly that, so the mappers only cast. Nothing on
 * the server reads those timestamps. `toSchema` maps its columns with `present` and writes the ISO strings itself.
 */
