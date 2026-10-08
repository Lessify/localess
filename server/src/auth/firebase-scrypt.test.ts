import { describe, expect, it } from 'vitest';
import { decodeFirebaseHash, encodeFirebaseHash, firebaseScryptHash, verifyFirebaseScrypt } from './firebase-scrypt.js';

/** The sample from https://github.com/firebase/scrypt (README, "Sample Password hash parameters"). */
const params = {
  signerKey: 'jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==',
  saltSeparator: 'Bw==',
  rounds: 8,
  memCost: 14,
};
const salt = '42xEC+ixf3L2lw==';
const expected = 'lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==';

describe('Firebase scrypt', () => {
  it('reproduces the reference hash', async () => {
    expect(await firebaseScryptHash('user1password', salt, params)).toBe(expected);
  });

  it('verifies the right password and rejects others, from the self-contained stored form', async () => {
    const stored = encodeFirebaseHash(params, expected);
    expect(decodeFirebaseHash(stored)).toEqual({ params, passwordHash: expected });
    expect(await verifyFirebaseScrypt('user1password', salt, stored)).toBe(true);
    expect(await verifyFirebaseScrypt('user1passwore', salt, stored)).toBe(false);
    expect(await verifyFirebaseScrypt('user1password', 'AAAAAAAAAA==', stored)).toBe(false);
    expect(await verifyFirebaseScrypt('user1password', salt, 'argon2id$whatever')).toBe(false);
  });
});
