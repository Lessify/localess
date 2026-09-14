import { describe, expect, it } from 'vitest';

import { buildAssetQuery, findTransformParam } from './asset-query';
import { AssetTransformQuery } from './image-transform';

/** A parsed query with everything absent, matching what `parseAssetTransformQuery({})` returns. */
function empty(): AssetTransformQuery {
  return {
    width: undefined,
    height: undefined,
    quality: undefined,
    format: undefined,
    fit: undefined,
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
      thumbnail: true,
    };

    expect(buildAssetQuery(query)).toBe('?w=400&h=300&q=75&f=webp&fit=inside&thumbnail');
  });

  describe('flags are valueless, matching the canonical form', () => {
    it('emits thumbnail with no value', () => {
      expect(buildAssetQuery({ ...empty(), thumbnail: true })).toBe('?thumbnail');
    });

    it('omits a false flag entirely', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, thumbnail: false })).toBe('?w=400');
    });
  });

  describe('quality is emitted only when the caller asked for it', () => {
    it('omits the default, so a bare URL does not gain a q', () => {
      // Emitting q=80 here would make the redirect target a *second* URL for identical bytes.
      expect(buildAssetQuery({ ...empty(), width: 400 })).toBe('?w=400');
    });

    it('includes an explicit quality', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, quality: 60 })).toBe('?w=400&q=60');
    });

    it('includes an explicit quality at the low and high bounds', () => {
      expect(buildAssetQuery({ ...empty(), quality: 1 })).toBe('?q=1');
      expect(buildAssetQuery({ ...empty(), quality: 100 })).toBe('?q=100');
    });
  });

  describe('round-trips the values a canonical redirect has to preserve', () => {
    it('keeps format and fit alongside a corrected width', () => {
      const query: AssetTransformQuery = { ...empty(), width: 400, format: 'jpeg', fit: 'cover' };

      expect(buildAssetQuery(query)).toBe('?w=400&f=jpeg&fit=cover');
    });

    it('keeps a height-only request height-only', () => {
      expect(buildAssetQuery({ ...empty(), height: 300 })).toBe('?h=300');
    });

    it('keeps thumbnail alongside a corrected size', () => {
      expect(buildAssetQuery({ ...empty(), width: 400, thumbnail: true })).toBe('?w=400&thumbnail');
    });
  });
});

describe('findTransformParam', () => {
  // The `/download` route applies no transform, so a transform parameter there is a caller error
  // rather than something to ignore — the same rule the parser follows for `fit=squish`.
  it.each([['w'], ['h'], ['q'], ['f'], ['fit'], ['thumbnail']])('detects %s', param => {
    expect(findTransformParam({ [param]: '400' })).toBe(param);
  });

  it('detects a valueless flag', () => {
    expect(findTransformParam({ thumbnail: '' })).toBe('thumbnail');
  });

  it('detects the download parameter removed in v4', () => {
    expect(findTransformParam({ download: '' })).toBe('download');
  });

  it('ignores parameters the download route legitimately carries', () => {
    expect(findTransformParam({ token: 'abc' })).toBeUndefined();
  });

  it('returns undefined for an empty query', () => {
    expect(findTransformParam({})).toBeUndefined();
  });

  it('reports the first offender, so the 400 can name one parameter', () => {
    expect(findTransformParam({ fit: 'cover', w: '400' })).toBe('w');
  });
});
