import { FormControl } from '@angular/forms';

import { LocaleValidator } from './locale.validator';

describe('LocaleValidator', () => {
  describe('LOCALE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl(null, LocaleValidator.LOCALE).hasError('required')).toBe(true);
    });

    it('is invalid when value is a plain string instead of an object', () => {
      expect(new FormControl('en', LocaleValidator.LOCALE).hasError('requireObject')).toBe(true);
    });

    it('is valid when value is a locale object', () => {
      expect(new FormControl({ id: 'en', name: 'English' }, LocaleValidator.LOCALE).valid).toBe(true);
    });
  });
});
