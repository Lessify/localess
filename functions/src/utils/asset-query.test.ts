import { describe, expect, it } from 'vitest';

import { buildAssetQuery } from './asset-query';
import { AssetTransformQuery, DEFAULT_QUALITY } from './image-transform';

/** A parsed query with everything absent, matching what `parseAssetTransformQuery({})` returns. */
function empty(): AssetTransformQuery {
  return {
    width: undefined,
    height: undefined,
    quality: DEFAULT_QUALITY,
    qualityExplicit: false,
    format: undefined,
    fit: undefined,
    download: false,
    thumbnail: false,
  };
}

describe('buildAssetQuery', () => {
  it('returns an empty string when nothing was supplied', () => {
    expect(buildAssetQuery(empty())).toBe('');
  });

  it('includes the leading question mark when there is something to emit', () => {
    expect(buildAssetQuery({ ...empty(), width: 400 })).toBe('?w=400');
  });

  it('emits parameters in a fixed order regardless of the caller', () => {
    const query: AssetTransformQuery = {
      width: 400,
      height: 300,
      quality: 75,
      qualityExplicit: true,
      format: 'webp',
      fit: 'inside',
      download: true,
      thumbnail: true,
    };

    expect(buildAssetQuery(query)).toBe('?w=400&h=300&q=75&f=webp&fit=inside&download&thumbnail');
  });

  describe('flags are valueless, matching the canonical form', () => {
    it('emits download with no value', () => {
      expect(buildAssetQuery({ ...empty(), download: true })).toBe('?download');
    });

    it('emits thumbnail with no value', () => {
      expect(buildAssetQuery({ ...empty(), thumbnail: true })).toBe('?thumbnail');
    });

    it('omits a false flag entirely', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, download: false, thumbnail: false })).toBe('?w=400');
    });
  });

  describe('quality is emitted only when the caller asked for it', () => {
    it('omits the default, so a bare URL does not gain a q', () => {
      // Emitting q=80 here would make the redirect target a *second* URL for identical bytes.
      expect(buildAssetQuery({ ...empty(), width: 400, qualityExplicit: false })).toBe('?w=400');
    });

    it('includes an explicit quality', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, quality: 60, qualityExplicit: true })).toBe('?w=400&q=60');
    });

    it('includes an explicit quality even when it equals the default', () => {
      expect(buildAssetQuery({ ...empty(), quality: DEFAULT_QUALITY, qualityExplicit: true })).toBe(`?q=${DEFAULT_QUALITY}`);
    });
  });

  describe('round-trips the values a canonical redirect has to preserve', () => {
    it('keeps format and fit alongside a corrected width', () => {
      const query: AssetTransformQuery = { ...empty(), width: 400, format: 'original', fit: 'cover' };

      expect(buildAssetQuery(query)).toBe('?w=400&f=original&fit=cover');
    });

    it('keeps a height-only request height-only', () => {
      expect(buildAssetQuery({ ...empty(), height: 300 })).toBe('?h=300');
    });

    it('keeps download alongside a corrected size', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, download: true })).toBe('?w=400&download');
    });
  });
});
