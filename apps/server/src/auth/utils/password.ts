import { hash, verify } from '@node-rs/argon2';

export { PASSWORD_MIN_LENGTH } from '@localess/shared';

export interface StoredCredential {
  passwordHash: string;
  hashAlgo: string;
}

export function hashPassword(password: string): Promise<string> {
  // @node-rs/argon2 defaults to argon2id with OWASP-recommended cost parameters.
  return hash(password);
}

// Verified against when the email is unknown, so a miss costs the same time as a wrong password.
let dummyHash: Promise<string> | undefined;

export interface PasswordCheck {
  valid: boolean;
}

export async function verifyPassword(credential: StoredCredential | undefined, password: string): Promise<PasswordCheck> {
  if (!credential) {
    dummyHash ??= hashPassword('localess-dummy-password');
    await verify(await dummyHash, password);
    return { valid: false };
  }
  switch (credential.hashAlgo) {
    case 'argon2id':
      return { valid: await verify(credential.passwordHash, password).catch(() => false) };
    default:
      return { valid: false };
  }
}
