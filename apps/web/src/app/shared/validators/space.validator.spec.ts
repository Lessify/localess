import { FormControl } from '@angular/forms';

import { isSafePreviewUrl, SpaceValidator } from './space.validator';

describe('SpaceValidator', () => {
  describe('NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SpaceValidator.NAME).hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      expect(new FormControl('ab', SpaceValidator.NAME).hasError('minlength')).toBe(true);
    });

    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' abc', SpaceValidator.NAME).hasError('noSpaceAround')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      expect(new FormControl('My Space', SpaceValidator.NAME).valid).toBe(true);
    });
  });

  describe('ENVIRONMENT_NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SpaceValidator.ENVIRONMENT_NAME).hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      expect(new FormControl('ab', SpaceValidator.ENVIRONMENT_NAME).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      expect(new FormControl('Production', SpaceValidator.ENVIRONMENT_NAME).valid).toBe(true);
    });
  });

  describe('ENVIRONMENT_URL', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SpaceValidator.ENVIRONMENT_URL).hasError('required')).toBe(true);
    });

    it('is invalid when it contains a space', () => {
      expect(new FormControl('http://a b.com', SpaceValidator.ENVIRONMENT_URL).hasError('noSpace')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      expect(new FormControl('ab', SpaceValidator.ENVIRONMENT_URL).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed url', () => {
      expect(new FormControl('https://example.com', SpaceValidator.ENVIRONMENT_URL).valid).toBe(true);
    });

    it('is valid for a local http url', () => {
      // Not :3000 - that is the test runner's own origin, which the validator rejects.
      expect(new FormControl('http://localhost:4321/', SpaceValidator.ENVIRONMENT_URL).valid).toBe(true);
    });

    it.each([['javascript:alert(1)//'], ['data:text/html,x'], ['/relative'], ['example.com']])('rejects %s', url => {
      expect(new FormControl(url, SpaceValidator.ENVIRONMENT_URL).hasError('previewUrl')).toBe(true);
    });

    it.each([['https://site.com/blog/{slug}'], ['https://{locale}.site.com/{fullSlug}'], ['https://site.com/{locale/}{fullSlug}/']])(
      'accepts the pattern %s',
      url => {
        expect(new FormControl(url, SpaceValidator.ENVIRONMENT_URL).valid).toBe(true);
      },
    );

    it('rejects an unknown placeholder, naming it', () => {
      const control = new FormControl('https://site.com/{lang}/{slug}', SpaceValidator.ENVIRONMENT_URL);

      expect(control.getError('previewUrlPlaceholder')).toBe('{lang}');
    });

    it('rejects a pattern that is not a safe URL once filled in', () => {
      expect(new FormControl('{fullSlug}', SpaceValidator.ENVIRONMENT_URL).hasError('previewUrl')).toBe(true);
    });
  });
});

describe('isSafePreviewUrl', () => {
  it('accepts http and https URLs on another origin', () => {
    expect(isSafePreviewUrl('https://site.example/', 'https://app.example')).toBe(true);
    expect(isSafePreviewUrl('http://localhost:3000/', 'https://app.example')).toBe(true);
  });

  it('rejects the app origin', () => {
    expect(isSafePreviewUrl('https://app.example/preview/', 'https://app.example')).toBe(false);
  });

  it('rejects script, data, blob and relative URLs', () => {
    for (const url of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,x',
      'blob:https://x/1',
      '/x',
      '',
    ]) {
      expect(isSafePreviewUrl(url, 'https://app.example')).toBe(false);
    }
  });

  it('rejects non-string values', () => {
    expect(isSafePreviewUrl(undefined, 'https://app.example')).toBe(false);
    expect(isSafePreviewUrl(42, 'https://app.example')).toBe(false);
  });
});
