import { describe, expect, it } from 'vitest';

import { buildContentDisposition } from './content-disposition';

describe('buildContentDisposition', () => {
  describe('disposition type', () => {
    it('uses inline for a normal response', () => {
      expect(buildContentDisposition('photo.jpg', false)).toBe('inline; filename="photo.jpg"');
    });

    it('uses attachment for a download, not the non-standard form-data', () => {
      // RFC 6266 defines `inline` and `attachment`; `form-data` is a multipart-body token
      // that only worked because browsers fall back to attachment for unknown types.
      expect(buildContentDisposition('photo.jpg', true)).toBe('attachment; filename="photo.jpg"');
    });
  });

  describe('ASCII names need no extended parameter', () => {
    it.each([['photo.jpg'], ['my-photo_v2.png'], ['photo (1).webp'], ['a.b.c.jpg']])('leaves %s as a plain filename', name => {
      expect(buildContentDisposition(name, false)).toBe(`inline; filename="${name}"`);
    });
  });

  describe('non-ASCII names get an RFC 5987 extended parameter', () => {
    it('adds filename* for Cyrillic', () => {
      const result = buildContentDisposition('фото.jpg', false);

      expect(result).toContain("filename*=UTF-8''%D1%84%D0%BE%D1%82%D0%BE.jpg");
    });

    it('adds filename* for CJK', () => {
      expect(buildContentDisposition('写真.png', false)).toContain("filename*=UTF-8''%E5%86%99%E7%9C%9F.png");
    });

    it('keeps an ASCII-safe fallback filename for clients that ignore filename*', () => {
      const result = buildContentDisposition('фото.jpg', false);

      // The fallback must be usable on its own — no percent-escapes leaking into it, and the
      // extension preserved so the file still opens.
      expect(result).toMatch(/^inline; filename="[\x20-\x7E]*\.jpg"/);
      expect(result).not.toMatch(/filename="[^"]*%[0-9A-F]{2}/);
    });

    it('emits the fallback before the extended parameter, as RFC 6266 recommends', () => {
      const result = buildContentDisposition('фото.jpg', true);

      expect(result.indexOf('filename=')).toBeLessThan(result.indexOf('filename*='));
      expect(result.startsWith('attachment; ')).toBe(true);
    });
  });

  describe('characters that would break the quoted string', () => {
    it('strips a double quote from the fallback', () => {
      expect(buildContentDisposition('a"b.jpg', false)).not.toMatch(/filename="[^"]*"[^;]/);
    });

    it('strips a backslash from the fallback', () => {
      expect(buildContentDisposition('a\\b.jpg', false)).toContain('filename="ab.jpg"');
    });

    it('strips control characters from the fallback', () => {
      expect(buildContentDisposition('a\r\nb.jpg', false)).toContain('filename="ab.jpg"');
    });

    it('never emits a raw newline, which would forge a header', () => {
      expect(buildContentDisposition('a\r\nX-Evil: 1\r\n.jpg', true)).not.toMatch(/[\r\n]/);
    });
  });

  describe('the fallback has to be worth falling back to', () => {
    it('does not leave stray punctuation as the whole name', () => {
      // Stripping `фото-тест.jpg` leaves `-.jpg` — valid, but useless to a client that
      // ignores filename*. A recognisable placeholder is better.
      expect(buildContentDisposition('фото-тест.jpg', true)).toContain('filename="file.jpg"');
    });

    it('keeps a partially-ASCII name that still reads as a name', () => {
      expect(buildContentDisposition('photo-фото.jpg', true)).toContain('filename="photo-.jpg"');
    });

    it('still carries the real name in the extended parameter', () => {
      expect(buildContentDisposition('фото-тест.jpg', true)).toContain("filename*=UTF-8''%D1%84%D0%BE%D1%82%D0%BE-%D1%82%D0%B5%D1%81%D1%82.jpg");
    });
  });

  describe('degenerate names still produce a usable header', () => {
    it('falls back to a placeholder when nothing ASCII survives', () => {
      const result = buildContentDisposition('фото', false);

      expect(result).toMatch(/^inline; filename="[^"]+"/);
      expect(result).toContain("filename*=UTF-8''");
    });

    it('handles an empty name', () => {
      expect(buildContentDisposition('', false)).toBe('inline; filename="file"');
    });
  });
});
