import { describe, expect, it } from 'vitest';

import { buildAssetETag } from './asset-etag';

describe('buildAssetETag', () => {
  it('wraps the tag in quotes, as HTTP requires', () => {
    expect(buildAssetETag('abc123', 'w200', false)).toBe('"abc123-w200"');
  });

  it('marks an untransformed original as orig', () => {
    expect(buildAssetETag('abc123', '', false)).toBe('"abc123-orig"');
  });

  it('distinguishes a thumbnail, which changes the bytes without changing the suffix', () => {
    expect(buildAssetETag('abc123', 'w200', true)).toBe('"abc123-w200-thumbnail"');
  });

  it('distinguishes a thumbnail of an untransformed original', () => {
    expect(buildAssetETag('abc123', '', true)).toBe('"abc123-orig-thumbnail"');
  });

  it('gives two requested widths that clamped to the same suffix the same tag', () => {
    // `suffix` is built from clamped dimensions, so ?w=3840 and ?w=1920 against a 1000px
    // source both arrive here as 'w1000' and must share a tag.
    expect(buildAssetETag('abc123', 'w1000', false)).toBe(buildAssetETag('abc123', 'w1000', false));
  });

  it('gives different tags to different content', () => {
    expect(buildAssetETag('abc123', 'w200', false)).not.toBe(buildAssetETag('def456', 'w200', false));
  });

  it('gives different tags to different transforms of the same content', () => {
    expect(buildAssetETag('abc123', 'w200', false)).not.toBe(buildAssetETag('abc123', 'w400', false));
  });
});
