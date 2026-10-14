import { TokenType } from '@localess/shared';
import { describe, expect, it } from 'vitest';
import { hashToken } from '../../auth/utils/token-hash.js';
import { newApiToken, parseApiToken, tokenColumns, tokenHint } from './api-token-format.js';

describe('API token format', () => {
  it.each([
    [TokenType.PUBLIC, 'pub_'],
    [TokenType.PREVIEW, 'prv_'],
    [TokenType.MANAGEMENT, 'mgt_'],
  ])('makes %s tokens with the %s prefix, 42 characters', (type, prefix) => {
    const value = newApiToken(type);
    expect(value).toMatch(/^(pub|prv|mgt)_[A-Za-z0-9]{38}$/);
    expect(value.startsWith(prefix)).toBe(true);
    expect(parseApiToken(value)).toBe(type);
  });

  it('makes a different value every time', () => {
    expect(new Set(Array.from({ length: 100 }, () => newApiToken(TokenType.PUBLIC))).size).toBe(100);
  });

  it('rejects a value whose checksum does not match (one character changed)', () => {
    const value = newApiToken(TokenType.PREVIEW);
    const i = 10;
    const changed = value.slice(0, i) + (value[i] === 'a' ? 'b' : 'a') + value.slice(i + 1);
    expect(parseApiToken(changed)).toBeUndefined();
  });

  it('rejects another prefix, the old 20-character format, and non-strings', () => {
    const value = newApiToken(TokenType.PUBLIC);
    expect(parseApiToken(`xyz_${value.slice(4)}`)).toBeUndefined();
    expect(parseApiToken('AAAAAAAAAAAAAAAAAAAA')).toBeUndefined();
    expect(parseApiToken(undefined)).toBeUndefined();
    expect(parseApiToken(['a'])).toBeUndefined();
  });

  it('hints with the prefix and the last 4 characters', () => {
    const value = newApiToken(TokenType.MANAGEMENT);
    expect(tokenHint(value)).toBe(`mgt_…${value.slice(-4)}`);
  });

  it('keeps the value for public and preview tokens, only the hash for management ones', () => {
    const pub = newApiToken(TokenType.PUBLIC);
    expect(tokenColumns(TokenType.PUBLIC, pub)).toEqual({ token: pub, tokenHash: hashToken(pub), hint: tokenHint(pub) });
    const mgt = newApiToken(TokenType.MANAGEMENT);
    expect(tokenColumns(TokenType.MANAGEMENT, mgt)).toEqual({ token: null, tokenHash: hashToken(mgt), hint: tokenHint(mgt) });
  });
});
