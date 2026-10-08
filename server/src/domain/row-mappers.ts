import type { schemas, translations } from '../database/schema.js';
import type { Schema, Translation } from './models/index.js';

/** Drops `null` columns, so rows look like the Firestore documents the ported helpers expect (absent, not null). */
function withoutNulls<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;
}

export function schemaFromRow(row: typeof schemas.$inferSelect): Schema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, id, ...rest } = withoutNulls(row);
  return rest as unknown as Schema;
}

export function translationFromRow(row: typeof translations.$inferSelect): Translation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { spaceId, id, ...rest } = withoutNulls(row);
  return rest as unknown as Translation;
}
