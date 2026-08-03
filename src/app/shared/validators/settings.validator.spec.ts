import { FormControl } from '@angular/forms';

import { SettingsValidator } from './settings.validator';

describe('SettingsValidator', () => {
  describe('UI_TEXT', () => {
    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' text', SettingsValidator.UI_TEXT).hasError('noSpaceAround')).toBe(true);
    });

    it('is invalid when longer than 30 characters', () => {
      expect(new FormControl('a'.repeat(31), SettingsValidator.UI_TEXT).hasError('maxlength')).toBe(true);
    });

    it('is valid for a well-formed value', () => {
      expect(new FormControl('Dashboard', SettingsValidator.UI_TEXT).valid).toBe(true);
    });
  });
});
