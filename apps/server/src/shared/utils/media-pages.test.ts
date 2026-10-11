import { describe, expect, it } from 'vitest';

import { isAnimatedPages } from './media-pages.js';

describe('isAnimatedPages', () => {
  // The regression this guards: a **static GIF reports `pages: 1`**, and the old test was
  // `pages !== undefined`, so every still GIF was treated as animated and passed through
  // untransformed — `?w=400` on one silently did nothing. Only a static WebP reports undefined.
  it('treats an absent page count as a still image', () => {
    expect(isAnimatedPages(undefined)).toBe(false);
  });

  it('treats a single page as a still image, not an animation', () => {
    expect(isAnimatedPages(1)).toBe(false);
  });

  it.each([[2], [6], [24], [120]])('treats %i pages as an animation', pages => {
    expect(isAnimatedPages(pages)).toBe(true);
  });
});
