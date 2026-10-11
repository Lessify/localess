import { describe, expect, it } from 'vitest';

import { parseByteRange } from './byte-range.js';

describe('parseByteRange', () => {
  const size = 1000;

  it('reads a closed range', () => {
    expect(parseByteRange('bytes=100-199', size)).toEqual({ start: 100, end: 199 });
  });

  it('reads an open range to the end (how players resume)', () => {
    expect(parseByteRange('bytes=900-', size)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange('bytes=0-', size)).toEqual({ start: 0, end: 999 });
  });

  it('reads a suffix range: the last n bytes, all of them when n is larger than the object', () => {
    expect(parseByteRange('bytes=-100', size)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange('bytes=-5000', size)).toEqual({ start: 0, end: 999 });
  });

  it('clamps an end past the object to its last byte', () => {
    expect(parseByteRange('bytes=500-5000', size)).toEqual({ start: 500, end: 999 });
  });

  it('answers unsatisfiable for a start past the end, a reversed range, an empty suffix or an empty object', () => {
    expect(parseByteRange('bytes=1000-', size)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=200-100', size)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=-0', size)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=0-', 0)).toBe('unsatisfiable');
  });

  it('ignores what it does not understand: the whole object is sent', () => {
    for (const header of [undefined, '', 'bytes=-', 'bytes=0-1,5-9', 'items=0-1', 'bytes=a-b', 'bytes= 0-1']) {
      expect(parseByteRange(header, size)).toBeUndefined();
    }
  });
});
