import type { UpdatedBy } from '../../infra/database/schema.js';
import type { UserRow } from '../../auth/users/users.service.js';

/** Who changed a row, as content and translations store it (`updated_by`): the user's name (else email) and email. */
export function updatedByOf(user: UserRow): UpdatedBy {
  return { name: user.displayName || user.email, email: user.email };
}
