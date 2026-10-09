import type { Translation } from '@localess/shared';
import type { translations } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

/** A `translations` row as the shared model (see `without-nulls.ts` for the timestamp cast). */
export function translationFromRow(row: typeof translations.$inferSelect): Translation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(row);
  return rest as unknown as Translation;
}
