import { describe, expect, it } from 'vitest';

import { ASSET_CSP, assetResponsePolicy } from './asset-headers.js';

describe('assetResponsePolicy', () => {
  describe('inline types', () => {
    it.each([['image/jpeg'], ['image/png'], ['image/webp'], ['image/avif'], ['image/gif'], ['video/mp4'], ['audio/mpeg']])(
      'serves %s inline under the sandbox CSP',
      type => {
        const policy = assetResponsePolicy(type, false);
        expect(policy.attachment).toBe(false);
        expect(policy.headers['Content-Security-Policy']).toBe(ASSET_CSP);
        expect(policy.headers['X-Content-Type-Options']).toBe('nosniff');
      },
    );

    it('serves SVG inline, sandboxed so its scripts cannot run on the app origin', () => {
      const policy = assetResponsePolicy('image/svg+xml', false);
      expect(policy.attachment).toBe(false);
      expect(policy.headers['Content-Security-Policy']).toContain('sandbox');
    });

    it('serves PDF inline without the sandbox CSP, which would block the browser viewer', () => {
      const policy = assetResponsePolicy('application/pdf', false);
      expect(policy.attachment).toBe(false);
      expect(policy.headers['Content-Security-Policy']).toBeUndefined();
      expect(policy.headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('active or unknown types', () => {
    it.each([
      ['text/html'],
      ['application/xhtml+xml'],
      ['text/xml'],
      ['application/xml'],
      ['text/javascript'],
      ['application/zip'],
      ['text/plain'],
    ])('forces %s to download', type => {
      const policy = assetResponsePolicy(type, false);
      expect(policy.attachment).toBe(true);
      expect(policy.headers['Content-Security-Policy']).toBe(ASSET_CSP);
    });

    it('is not fooled by casing or parameters', () => {
      expect(assetResponsePolicy('TEXT/HTML; charset=utf-8', false).attachment).toBe(true);
      expect(assetResponsePolicy('Image/PNG', false).attachment).toBe(false);
    });

    it('falls back to octet-stream as an attachment when the type is missing', () => {
      expect(assetResponsePolicy(undefined, false)).toMatchObject({ contentType: 'application/octet-stream', attachment: true });
      expect(assetResponsePolicy('  ', false)).toMatchObject({ contentType: 'application/octet-stream', attachment: true });
    });
  });

  it('always uses attachment on the download route', () => {
    expect(assetResponsePolicy('image/png', true).attachment).toBe(true);
  });

  it('keeps the stored type as the content type', () => {
    expect(assetResponsePolicy('image/png', false).contentType).toBe('image/png');
  });
});
