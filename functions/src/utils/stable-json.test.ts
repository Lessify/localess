import { describe, expect, it } from 'vitest';
import { stableStringify } from './stable-json';

describe('stableStringify', () => {
  it('sorts object keys recursively', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
  it('preserves array order', () => {
    expect(stableStringify([{ b: 1, a: 2 }, 'x'])).toBe('[{"a":2,"b":1},"x"]');
  });
  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(5)).toBe('5');
  });
});
