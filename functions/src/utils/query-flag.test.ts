import { describe, expect, it } from 'vitest';
import { isFlagSet } from './query-flag';

describe('isFlagSet', () => {
  it('treats a bare flag (?x) as set', () => {
    expect(isFlagSet('')).toBe(true);
  });

  it('treats an explicit truthy value as set', () => {
    expect(isFlagSet('true')).toBe(true);
    expect(isFlagSet('1')).toBe(true);
    expect(isFlagSet('yes')).toBe(true);
  });

  it('treats an absent param as not set', () => {
    expect(isFlagSet(undefined)).toBe(false);
  });

  it('treats a repeated param (array) as set', () => {
    expect(isFlagSet(['true'])).toBe(true);
    expect(isFlagSet([''])).toBe(true);
  });

  it('treats any present value as set, matching the existing `download` semantics', () => {
    // `download` has always used `!== undefined`, so `?download=false` enables it.
    // `thumbnail` must behave identically rather than introduce a second convention.
    expect(isFlagSet('false')).toBe(true);
    expect(isFlagSet('0')).toBe(true);
  });

  it('supports the bare-flag URLs the app itself builds — do not require a value', () => {
    // The Localess UI links to assets with a valueless flag, e.g.
    //   /api/v1/spaces/{spaceId}/assets/{assetId}?download
    // (see `onDownload` in the assets feature). Both Express 5 query parsers, `simple`
    // (node:querystring) and `extended` (qs), parse `?download` to the empty string, so
    // presence — never truthiness, never a literal 'true' — is the contract for these params.
    const parsedByExpress = { download: '' };
    expect(isFlagSet(parsedByExpress.download)).toBe(true);
  });
});
