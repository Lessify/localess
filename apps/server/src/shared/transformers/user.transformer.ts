import type { User } from '@localess/shared';

import type { UserEntity } from '../entities/user.entity.js';
import type { UserWithSignIn } from '../queries/user.query.js';

/** A user as the App API answers it: the row, with `identities` and `hasPassword` when read `with: USER_SIGN_IN`. */
export function toUser(user: UserEntity | UserWithSignIn): User {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.photoUrl ? { photoUrl: user.photoUrl } : {}),
    disabled: user.disabled,
    ...(user.role ? { role: user.role } : {}),
    ...('identities' in user
      ? {
          identities: user.identities.map(it => ({ provider: it.provider, createdAt: it.createdAt.toISOString() })),
          hasPassword: user.credential != null,
        }
      : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
