/** Drops `null` columns, so rows look like the Firestore documents the ported helpers expect (absent, not null). */
export function withoutNulls<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;
}

/*
 * Row → shared model mappers (`schemaFromRow`, `translationFromRow`) rely on this: the shared models describe the
 * JSON wire format, where timestamps are ISO strings; rows carry `Date`, which serialises to exactly that, so the
 * mappers only cast. Nothing on the server reads those timestamps.
 */
