import { FormControl } from '@angular/forms';

import { SchemaValidator } from './schema.validator';

describe('SchemaValidator', () => {
  describe('ID', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.ID).hasError('required')).toBe(true);
    });

    it('is invalid when it contains a space', () => {
      expect(new FormControl('My Schema', SchemaValidator.ID).hasError('noSpace')).toBe(true);
    });

    it('is invalid when it is a reserved name (case-insensitive)', () => {
      expect(new FormControl('translations', SchemaValidator.ID).hasError('reservedName')).toBe(true);
    });

    it('is invalid when shorter than 2 characters', () => {
      expect(new FormControl('A', SchemaValidator.ID).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed id', () => {
      expect(new FormControl('MySchema', SchemaValidator.ID).valid).toBe(true);
    });
  });

  describe('TYPE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.TYPE).hasError('required')).toBe(true);
    });

    it('is valid when set', () => {
      expect(new FormControl('SECTION', SchemaValidator.TYPE).valid).toBe(true);
    });
  });

  describe('DESCRIPTION', () => {
    it('is invalid when longer than 250 characters', () => {
      expect(new FormControl('a'.repeat(251), SchemaValidator.DESCRIPTION).hasError('maxlength')).toBe(true);
    });

    it('is valid when empty (optional)', () => {
      expect(new FormControl('', SchemaValidator.DESCRIPTION).valid).toBe(true);
    });
  });

  describe('DISPLAY_NAME', () => {
    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' name', SchemaValidator.DISPLAY_NAME).hasError('noSpaceAround')).toBe(true);
    });

    it('is invalid when longer than 50 characters', () => {
      expect(new FormControl('a'.repeat(51), SchemaValidator.DISPLAY_NAME).hasError('maxlength')).toBe(true);
    });

    it('is valid when empty (optional)', () => {
      expect(new FormControl('', SchemaValidator.DISPLAY_NAME).valid).toBe(true);
    });
  });

  describe('LABEL', () => {
    it('is invalid when it contains a space', () => {
      expect(new FormControl('a b', SchemaValidator.LABEL).hasError('noSpace')).toBe(true);
    });

    it('is invalid when shorter than 2 characters', () => {
      expect(new FormControl('a', SchemaValidator.LABEL).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed label', () => {
      expect(new FormControl('label', SchemaValidator.LABEL).valid).toBe(true);
    });
  });

  describe('FIELD_NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.FIELD_NAME).hasError('required')).toBe(true);
    });

    it('is invalid when it does not match the JSON name pattern', () => {
      expect(new FormControl('123abc', SchemaValidator.FIELD_NAME).hasError('pattern')).toBe(true);
    });

    it('is invalid when it contains the reserved "_i18n_" marker', () => {
      expect(new FormControl('title_i18n_x', SchemaValidator.FIELD_NAME).hasError('pattern')).toBe(true);
    });

    it('is invalid when it is a reserved field name', () => {
      expect(new FormControl('_id', SchemaValidator.FIELD_NAME).hasError('reservedName')).toBe(true);
    });

    it('is valid for a well-formed field name', () => {
      expect(new FormControl('title', SchemaValidator.FIELD_NAME).valid).toBe(true);
    });
  });

  describe('FIELD_KIND', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.FIELD_KIND).hasError('required')).toBe(true);
    });

    it('is valid when set', () => {
      expect(new FormControl('TEXT', SchemaValidator.FIELD_KIND).valid).toBe(true);
    });
  });

  describe('FIELD_DISPLAY_NAME', () => {
    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' name', SchemaValidator.FIELD_DISPLAY_NAME).hasError('noSpaceAround')).toBe(true);
    });

    it('is invalid when longer than 30 characters', () => {
      expect(new FormControl('a'.repeat(31), SchemaValidator.FIELD_DISPLAY_NAME).hasError('maxlength')).toBe(true);
    });
  });

  describe('FIELD_ENUM_NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.FIELD_ENUM_NAME).hasError('required')).toBe(true);
    });

    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' name', SchemaValidator.FIELD_ENUM_NAME).hasError('noSpaceAround')).toBe(true);
    });

    it('is valid for a well-formed enum name', () => {
      expect(new FormControl('Color', SchemaValidator.FIELD_ENUM_NAME).valid).toBe(true);
    });
  });

  describe('FIELD_ENUM_VALUE', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', SchemaValidator.FIELD_ENUM_VALUE).hasError('required')).toBe(true);
    });

    it('is invalid when it contains a space', () => {
      expect(new FormControl('a b', SchemaValidator.FIELD_ENUM_VALUE).hasError('noSpace')).toBe(true);
    });

    it('is invalid when it does not match the enum value pattern', () => {
      expect(new FormControl('!!!', SchemaValidator.FIELD_ENUM_VALUE).hasError('pattern')).toBe(true);
    });

    it('is valid for a well-formed enum value', () => {
      expect(new FormControl('red', SchemaValidator.FIELD_ENUM_VALUE).valid).toBe(true);
    });
  });

  describe('FIELD_REFERENCE_PATH', () => {
    it('is invalid with leading/trailing spaces', () => {
      expect(new FormControl(' path', SchemaValidator.FIELD_REFERENCE_PATH).hasError('noSpaceAround')).toBe(true);
    });

    it('is valid when empty (optional)', () => {
      expect(new FormControl('', SchemaValidator.FIELD_REFERENCE_PATH).valid).toBe(true);
    });
  });
});
