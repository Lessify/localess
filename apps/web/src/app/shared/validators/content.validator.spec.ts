import { FormControl } from '@angular/forms';

import { ContentValidator } from './content.validator';

describe('ContentValidator', () => {
  describe('NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', ContentValidator.NAME).hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 2 characters', () => {
      expect(new FormControl('a', ContentValidator.NAME).hasError('minlength')).toBe(true);
    });

    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl('ab ', ContentValidator.NAME).hasError('noSpaceAround')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      expect(new FormControl('My Content', ContentValidator.NAME).valid).toBe(true);
    });
  });

  describe('SLUG', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', ContentValidator.SLUG).hasError('required')).toBe(true);
    });

    it('is invalid when it contains a space', () => {
      expect(new FormControl('my slug', ContentValidator.SLUG).hasError('noSpace')).toBe(true);
    });

    it('is invalid when it does not match the URL slug pattern', () => {
      expect(new FormControl('My_Slug!', ContentValidator.SLUG).hasError('pattern')).toBe(true);
    });

    it('is valid for a well-formed slug', () => {
      expect(new FormControl('my-slug_123', ContentValidator.SLUG).valid).toBe(true);
    });
  });

  describe('SCHEMA', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', ContentValidator.SCHEMA).hasError('required')).toBe(true);
    });

    it('is valid when a schema id is set', () => {
      expect(new FormControl('MySchema', ContentValidator.SCHEMA).valid).toBe(true);
    });
  });
});
