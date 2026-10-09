import { createCipheriv, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Firebase Auth's modified scrypt (https://github.com/firebase/scrypt), so users imported from
 * Firebase keep their passwords. The project-wide parameters come from the Firebase console
 * (Authentication → Users → ⋮ → Password hash parameters).
 */
export interface FirebaseScryptParams {
  /** base64 `base64_signer_key` */
  signerKey: string;
  /** base64 `base64_salt_separator` */
  saltSeparator: string;
  rounds: number;
  memCost: number;
}

const PREFIX = 'firebase-scrypt';

/** Stored form: every parameter travels with the hash, so verification needs no configuration. */
export function encodeFirebaseHash(params: FirebaseScryptParams, passwordHash: string): string {
  return [PREFIX, params.rounds, params.memCost, params.saltSeparator, params.signerKey, passwordHash].join('$');
}

export function decodeFirebaseHash(stored: string): { params: FirebaseScryptParams; passwordHash: string } | undefined {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return undefined;
  const [, rounds, memCost, saltSeparator, signerKey, passwordHash] = parts;
  return { params: { rounds: Number(rounds), memCost: Number(memCost), saltSeparator, signerKey }, passwordHash };
}

/** base64 hash of `password` with a user's base64 `salt`, as Firebase computes it. */
export function firebaseScryptHash(password: string, salt: string, params: FirebaseScryptParams): Promise<string> {
  const saltWithSeparator = Buffer.concat([Buffer.from(salt, 'base64'), Buffer.from(params.saltSeparator, 'base64')]);
  const N = 2 ** params.memCost;
  return new Promise((resolve, reject) => {
    scrypt(
      Buffer.from(password, 'utf8'),
      saltWithSeparator,
      32,
      { N, r: params.rounds, p: 1, maxmem: 256 * N * params.rounds },
      (error, key) => {
        if (error) return reject(error);
        const cipher = createCipheriv('aes-256-ctr', key, Buffer.alloc(16, 0));
        resolve(Buffer.concat([cipher.update(Buffer.from(params.signerKey, 'base64')), cipher.final()]).toString('base64'));
      },
    );
  });
}

export async function verifyFirebaseScrypt(password: string, salt: string, stored: string): Promise<boolean> {
  const decoded = decodeFirebaseHash(stored);
  if (!decoded) return false;
  const actual = Buffer.from(await firebaseScryptHash(password, salt, decoded.params), 'base64');
  const expected = Buffer.from(decoded.passwordHash, 'base64');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
