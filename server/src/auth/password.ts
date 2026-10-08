import { hash, verify } from '@node-rs/argon2';

export const PASSWORD_MIN_LENGTH = 6;

export interface StoredCredential {
  passwordHash: string;
  hashAlgo: string;
  salt: string | null;
}

export function hashPassword(password: string): Promise<string> {
  // @node-rs/argon2 defaults to argon2id with OWASP-recommended cost parameters.
  return hash(password);
}

// Verified against when the email is unknown, so a miss costs the same time as a wrong password.
let dummyHash: Promise<string> | undefined;

export interface PasswordCheck {
  valid: boolean;
  /** True when the stored hash should be replaced with a fresh argon2id hash of the same password. */
  needsRehash: boolean;
}

export async function verifyPassword(credential: StoredCredential | undefined, password: string): Promise<PasswordCheck> {
  if (!credential) {
    dummyHash ??= hashPassword('localess-dummy-password');
    await verify(await dummyHash, password);
    return { valid: false, needsRehash: false };
  }
  switch (credential.hashAlgo) {
    case 'argon2id':
      return { valid: await verify(credential.passwordHash, password).catch(() => false), needsRehash: false };
    default:
      // 'firebase-scrypt' (imported accounts) is added with the Firebase import in Phase 6.
      return { valid: false, needsRehash: false };
  }
}
