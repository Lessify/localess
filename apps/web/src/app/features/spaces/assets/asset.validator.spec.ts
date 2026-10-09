import { FormControl } from '@angular/forms';

import { AssetValidator } from './asset.validator';

describe('AssetValidator', () => {
  describe('NAME', () => {
    it('is invalid when empty (required)', () => {
      const control = new FormControl('', AssetValidator.NAME);
      expect(control.valid).toBe(false);
      expect(control.hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      const control = new FormControl('ab', AssetValidator.NAME);
      expect(control.hasError('minlength')).toBe(true);
    });

    it('is invalid when it has leading/trailing spaces', () => {
      const control = new FormControl(' abc', AssetValidator.NAME);
      expect(control.hasError('noSpaceAround')).toBe(true);
    });

    it('is invalid when longer than 250 characters', () => {
      const control = new FormControl('a'.repeat(251), AssetValidator.NAME);
      expect(control.hasError('maxlength')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      const control = new FormControl('my-asset.png', AssetValidator.NAME);
      expect(control.valid).toBe(true);
    });
  });
});
