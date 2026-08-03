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

    it('is valid for a well-formed id', () => {
      expect(new FormControl('home.title', TranslationValidator.ID).valid).toBe(true);
    });
  });

  describe('STRING_VALUE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.STRING_VALUE).hasError('required')).toBe(true);
    });

    it('is invalid when longer than 1000 characters', () => {
      expect(new FormControl('a'.repeat(1001), TranslationValidator.STRING_VALUE).hasError('maxlength')).toBe(true);
    });

    it('is valid for a well-formed value', () => {
      expect(new FormControl('Welcome', TranslationValidator.STRING_VALUE).valid).toBe(true);
    });
  });

  describe('PLURAL_VALUE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.PLURAL_VALUE).hasError('required')).toBe(true);
    });

    it('is invalid when longer than 300 characters', () => {
      expect(new FormControl('a'.repeat(301), TranslationValidator.PLURAL_VALUE).hasError('maxlength')).toBe(true);
    });
  });

  describe('ARRAY_VALUE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.ARRAY_VALUE).hasError('required')).toBe(true);
    });

    it('is invalid when longer than 150 characters', () => {
      expect(new FormControl('a'.repeat(151), TranslationValidator.ARRAY_VALUE).hasError('maxlength')).toBe(true);
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

  describe('TYPE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TranslationValidator.TYPE).hasError('required')).toBe(true);
    });

    it('is valid when set', () => {
      expect(new FormControl('STRING', TranslationValidator.TYPE).valid).toBe(true);
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
