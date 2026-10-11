/**
 * Whether sharp's reported page count means a genuine animation.
 *
 * Not `pages !== undefined`, which is what this used to be and is wrong: a **static GIF reports
 * `pages: 1`**, so every still GIF was treated as animated and passed through untransformed —
 * `?w=400` on one silently did nothing. Only a static WebP reports `undefined`.
 * @param {number} [pages] `pages` from sharp metadata
 * @return {boolean} true when the image has more than one frame
 */
export function isAnimatedPages(pages?: number): boolean {
  return (pages ?? 1) > 1;
}
