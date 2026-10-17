import { FormControl } from '@angular/forms';

import { TranslationValidator } from './translation.validator';

describe('TranslationValidator', () => {
  describe('ID', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.ID).hasError('required')).toBe(true);
    });

    it('is invalid when it contains a space', () => {
      expect(new FormControl('a b', TranslationValidator.ID).hasError('noSpace')).toBe(true);
    });

    it('is invalid when shorter than 2 characters', () => {
      expect(new FormControl('a', TranslationValidator.ID).hasError('minlength')).toBe(true);
    });

    it('follows the shared key rule: a letter first, a letter or digit last, at most 150', () => {
      expect(new FormControl('trailing.', TranslationValidator.ID).hasError('pattern')).toBe(true);
      expect(new FormControl('1st', TranslationValidator.ID).hasError('pattern')).toBe(true);
      expect(new FormControl('x'.repeat(151), TranslationValidator.ID).hasError('maxlength')).toBe(true);
      expect(new FormControl('x'.repeat(150), TranslationValidator.ID).valid).toBe(true);
    });

    it('is valid for a well-formed id', () => {
      expect(new FormControl('home.title', TranslationValidator.ID).valid).toBe(true);
    });
  });

  describe('STRING_VALUE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.STRING_VALUE).hasError('required')).toBe(true);
    });

    it('allows the shared limit of 10,000 characters, not more', () => {
      expect(new FormControl('a'.repeat(10_000), TranslationValidator.STRING_VALUE).valid).toBe(true);
      expect(new FormControl('a'.repeat(10_001), TranslationValidator.STRING_VALUE).hasError('maxlength')).toBe(true);
    });

    it('is valid for a well-formed value', () => {
      expect(new FormControl('Welcome', TranslationValidator.STRING_VALUE).valid).toBe(true);
    });
  });

  describe('DESCRIPTION', () => {
    it('is invalid when longer than 250 characters', () => {
      expect(new FormControl('a'.repeat(251), TranslationValidator.DESCRIPTION).hasError('maxlength')).toBe(true);
    });

    it('is valid when empty (optional)', () => {
      expect(new FormControl('', TranslationValidator.DESCRIPTION).valid).toBe(true);
    });
  });

  describe('labelError', () => {
    it('refuses spaces, fewer than 2 or more than 50 characters, and a label already added', () => {
      expect(TranslationValidator.labelError('a b', [])).toBe('A label can not contain spaces.');
      expect(TranslationValidator.labelError('a', [])).toBe('A label needs at least 2 characters.');
      expect(TranslationValidator.labelError('x'.repeat(51), [])).toBe('A label can have at most 50 characters.');
      expect(TranslationValidator.labelError('ui', ['ui'])).toBe("'ui' is already added.");
    });

    it('accepts a well-formed new label', () => {
      expect(TranslationValidator.labelError('label', ['other'])).toBeUndefined();
    });
  });

  describe('LABELS', () => {
    it('accepts a single label, and up to the server limit of 100', () => {
      expect(new FormControl(['solo'], TranslationValidator.LABELS).valid).toBe(true);
      expect(new FormControl(Array.from({ length: 100 }, (_, i) => `l${i}`), TranslationValidator.LABELS).valid).toBe(true);
      expect(new FormControl(Array.from({ length: 101 }, (_, i) => `l${i}`), TranslationValidator.LABELS).valid).toBe(false);
    });
  });
});
