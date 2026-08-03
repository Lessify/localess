import { FormControl } from '@angular/forms';

import { TokenValidator } from './token.validator';

describe('TokenValidator', () => {
  describe('NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', TokenValidator.NAME).hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      expect(new FormControl('ab', TokenValidator.NAME).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      expect(new FormControl('CI Token', TokenValidator.NAME).valid).toBe(true);
    });
  });

  describe('PERMISSIONS', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl(null, TokenValidator.PERMISSIONS).hasError('required')).toBe(true);
    });

    it('is valid when at least one permission is set', () => {
      expect(new FormControl(['contents:read'], TokenValidator.PERMISSIONS).valid).toBe(true);
    });
  });

  describe('CACHE_TTL', () => {
    it('only enforces the max bound, due to the comma-operator bug collapsing the array to Validators.max', () => {
      expect(new FormControl(31536001, TokenValidator.CACHE_TTL).hasError('max')).toBe(true);
    });

    it('does not enforce a minimum bound (Validators.min is discarded by the comma operator)', () => {
      expect(new FormControl(-100, TokenValidator.CACHE_TTL).valid).toBe(true);
    });

    it('is valid within bounds', () => {
      expect(new FormControl(3600, TokenValidator.CACHE_TTL).valid).toBe(true);
    });
  });
});
