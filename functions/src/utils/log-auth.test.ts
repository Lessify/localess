import { describe, expect, it } from 'vitest';
import { authUid } from './log-auth';

describe('authUid', () => {
  it('returns only the uid, never the token', () => {
    const auth = { uid: 'user-1', rawToken: 'secret-id-token', token: { email: 'a@b.c' } };
    expect(authUid(auth)).toBe('user-1');
  });

  it('marks unauthenticated calls as anonymous', () => {
    expect(authUid(undefined)).toBe('anonymous');
    expect(authUid(null)).toBe('anonymous');
  });
});
