import type { User } from '@localess/shared';

import type { UserEntity } from '../entities/user.entity.js';
import type { UserSignIn } from '../queries/user.query.js';

/** A user as the App API answers it: the row, with how they sign in (`findUserSignIns`) when it was read. */
export function toUser(user: UserEntity, signIn?: UserSignIn): User {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.photoUrl ? { photoUrl: user.photoUrl } : {}),
    disabled: user.disabled,
    ...(user.role ? { role: user.role } : {}),
    ...(signIn ? { identities: signIn.identities, hasPassword: signIn.hasPassword } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
