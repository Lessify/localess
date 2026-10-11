import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies argon2id hashes', async () => {
    const passwordHash = await hashPassword('correct horse');
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    const credential = { passwordHash, hashAlgo: 'argon2id' };
    expect(await verifyPassword(credential, 'correct horse')).toEqual({ valid: true });
    expect(await verifyPassword(credential, 'wrong')).toEqual({ valid: false });
  });

  it('rejects when there is no credential, or an unknown algorithm', async () => {
    expect((await verifyPassword(undefined, 'anything')).valid).toBe(false);
    expect((await verifyPassword({ passwordHash: 'x', hashAlgo: 'md5' }, 'x')).valid).toBe(false);
  });
});
