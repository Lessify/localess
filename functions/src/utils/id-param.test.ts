import { describe, expect, it } from 'vitest';
import { assertPathSegment, isValidId } from './id-param';

describe('isValidId', () => {
  it('accepts Firestore auto-IDs and simple slugs', () => {
    expect(isValidId('aBc123XyZ987qWe456Rt')).toBe(true);
    expect(isValidId('my_id-1')).toBe(true);
  });

  it.each([['X/draft'], ['..'], ['a.b'], ['a%2Fb'], ['a b'], [''], ['a'.repeat(129)]])('rejects %j', value => {
    expect(isValidId(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(['a'])).toBe(false);
    expect(isValidId(42)).toBe(false);
  });
});

describe('assertPathSegment', () => {
  it('throws for an ID that would add a path segment', () => {
    expect(() => assertPathSegment('X/draft', 'content id')).toThrow("Invalid content id 'X/draft'");
    expect(() => assertPathSegment('X', 'content id')).not.toThrow();
  });
});
