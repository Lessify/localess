import { FormControl } from '@angular/forms';

import { SpaceValidator } from './space.validator';

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
  });
});
