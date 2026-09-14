import { describe, expect, it } from 'vitest';

import { resolveOrientedDimensions } from './image-orientation';

describe('resolveOrientedDimensions', () => {
  describe('orientations that rotate a quarter turn transpose the axes', () => {
    // The regression this guards, verified against exiftool-vendored: a 400x200 JPEG tagged
    // `Orientation: 6` reports `ImageWidth: 400, ImageHeight: 200`. Reading those without the tag
    // recorded the asset as 400x200 `landscape` when it renders 200x400 portrait.
    it.each([[5], [6], [7], [8]])('swaps width and height for orientation %i', orientation => {
      expect(resolveOrientedDimensions(400, 200, orientation)).toEqual({
        width: 200,
        height: 400,
        orientation: 'portrait',
      });
    });

    it('turns a landscape file into a portrait asset, which is the user-visible half', () => {
      expect(resolveOrientedDimensions(400, 200, 6).orientation).toBe('portrait');
    });
  });

  describe('orientations that do not rotate leave the axes alone', () => {
    it.each([[1], [2], [3], [4]])('keeps width and height for orientation %i', orientation => {
      expect(resolveOrientedDimensions(400, 200, orientation)).toEqual({
        width: 400,
        height: 200,
        orientation: 'landscape',
      });
    });

    it('keeps them when no tag is present at all', () => {
      expect(resolveOrientedDimensions(400, 200, undefined)).toEqual({
        width: 400,
        height: 200,
        orientation: 'landscape',
      });
    });
  });

  describe('an unrecognised tag is treated as no rotation rather than guessed at', () => {
    // exiftool can be configured to return a description instead of a number. Rather than parse
    // prose, anything non-numeric keeps the previous behaviour.
    it.each([['Rotate 90 CW'], [''], [null], [{}], [6.5], [9], [0]])('ignores %s', value => {
      expect(resolveOrientedDimensions(400, 200, value)).toMatchObject({ width: 400, height: 200 });
    });
  });

  describe('shape', () => {
    it('reports a square image as squarish', () => {
      expect(resolveOrientedDimensions(300, 300, 1).orientation).toBe('squarish');
    });

    it('reports a rotated square as squarish too', () => {
      expect(resolveOrientedDimensions(300, 300, 6).orientation).toBe('squarish');
    });
  });

  describe('missing dimensions', () => {
    it.each([
      [undefined, 200],
      [400, undefined],
      [undefined, undefined],
    ])('returns nothing when width is %s and height is %s', (width, height) => {
      expect(resolveOrientedDimensions(width, height, 6)).toEqual({});
    });
  });
});
