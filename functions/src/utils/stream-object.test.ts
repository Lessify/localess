import { describe, expect, it } from 'vitest';
import { parseByteRange } from './stream-object';

describe('parseByteRange', () => {
  it('returns undefined when there is nothing to honour', () => {
    expect(parseByteRange(undefined, 100)).toBeUndefined();
    expect(parseByteRange('items=0-5', 100)).toBeUndefined();
    expect(parseByteRange('bytes=-', 100)).toBeUndefined();
    expect(parseByteRange('bytes=0-1,5-6', 100)).toBeUndefined();
    expect(parseByteRange('bytes=9-2', 100)).toBeUndefined();
  });

  it('parses a closed range', () => {
    expect(parseByteRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
  });

  it('parses an open-ended range to the last byte', () => {
    expect(parseByteRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
  });

  it('clamps an end past the object', () => {
    expect(parseByteRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
  });

  it('parses a suffix range, clamped to the object', () => {
    expect(parseByteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 });
  });

  it('reports a range wholly outside the object as unsatisfiable', () => {
    expect(parseByteRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=-0', 100)).toBe('unsatisfiable');
  });
});
