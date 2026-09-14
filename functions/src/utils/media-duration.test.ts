import { describe, expect, it } from 'vitest';

import { normaliseDuration } from './media-duration';

describe('normaliseDuration', () => {
  describe('clock strings, the form exiftool reports for WebM and friends', () => {
    it('parses hours, minutes and seconds', () => {
      expect(normaliseDuration('00:01:05.161000000')).toBe(65);
    });

    it('carries the hours component', () => {
      expect(normaliseDuration('01:02:03')).toBe(3723);
    });

    it('rounds sub-second precision rather than truncating it', () => {
      expect(normaliseDuration('00:00:05.600')).toBe(6);
    });
  });

  describe('numbers', () => {
    it('rounds a float to whole seconds', () => {
      expect(normaliseDuration(65.4)).toBe(65);
    });

    it('keeps an integer as-is', () => {
      expect(normaliseDuration(222)).toBe(222);
    });

    it('rejects a non-finite number', () => {
      expect(normaliseDuration(Number.NaN)).toBeUndefined();
      expect(normaliseDuration(Number.POSITIVE_INFINITY)).toBeUndefined();
    });
  });

  describe('numeric strings, including the unit suffix exiftool sometimes appends', () => {
    it('parses a bare numeric string', () => {
      expect(normaliseDuration('12.5')).toBe(13);
    });

    it('parses one with a trailing unit', () => {
      expect(normaliseDuration('12.50 s')).toBe(13);
    });
  });

  describe('anything unreadable yields undefined rather than a guess', () => {
    it.each([[undefined], [null], ['abc'], [''], [{}], [[]], [true]])('rejects %s', value => {
      expect(normaliseDuration(value)).toBeUndefined();
    });

    it('rejects a malformed clock string', () => {
      expect(normaliseDuration('aa:bb:cc')).toBeUndefined();
    });
  });
});
