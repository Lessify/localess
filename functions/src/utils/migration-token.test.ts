import { describe, expect, it } from 'vitest';
import { checkMigrationToken, hashMigrationToken, newMigrationToken } from './migration-token';

describe('migration token', () => {
  it('makes 40 url-safe characters, different every time', () => {
    const a = newMigrationToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{40}$/);
    expect(newMigrationToken()).not.toBe(a);
  });

  it('hashes with sha256 hex', () => {
    expect(hashMigrationToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('is disabled without a stored hash', () => {
    expect(checkMigrationToken('Bearer x', undefined)).toBe('disabled');
    expect(checkMigrationToken('Bearer x', {})).toBe('disabled');
  });

  it('accepts only the matching bearer token', () => {
    const stored = { tokenHash: hashMigrationToken('secret') };
    expect(checkMigrationToken('Bearer secret', stored)).toBe('ok');
    expect(checkMigrationToken('Bearer other', stored)).toBe('unauthorized');
    expect(checkMigrationToken('secret', stored)).toBe('unauthorized');
    expect(checkMigrationToken(undefined, stored)).toBe('unauthorized');
  });
});
