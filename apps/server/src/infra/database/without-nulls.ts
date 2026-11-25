/** Drops `null` columns, so rows look like the Firestore documents the ported helpers expect (absent, not null). */
export function withoutNulls<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;
}

/** `withoutNulls` for a picked set of columns, typed: each one optional and never `null`. */
export function present<T extends object>(columns: T): { [K in keyof T]?: NonNullable<T[K]> } {
  return withoutNulls(columns);
}

/*
 * Transformers list their fields and write ISO timestamps themselves (`toTranslation`, `toWebhook`); `toSchema` maps its
 * optional columns with `present`.
 */
