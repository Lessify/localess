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

  describe('LABEL', () => {
    it('is invalid when it contains a space', () => {
      expect(new FormControl('a b', TranslationValidator.LABEL).hasError('noSpace')).toBe(true);
    });

    it('is invalid when shorter than 2 characters', () => {
      expect(new FormControl('a', TranslationValidator.LABEL).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed label', () => {
      expect(new FormControl('label', TranslationValidator.LABEL).valid).toBe(true);
    });
  });
});
