import { FormArray, FormControl } from '@angular/forms';

import { CommonValidator } from './common.validator';

describe('CommonValidator', () => {
  describe('noSpace', () => {
    it('returns null for empty value', () => {
      expect(CommonValidator.noSpace(new FormControl(''))).toBeNull();
    });

    it('returns null for null value', () => {
      expect(CommonValidator.noSpace(new FormControl(null))).toBeNull();
    });

    it('returns null when there is no space', () => {
      expect(CommonValidator.noSpace(new FormControl('abc'))).toBeNull();
    });

    it('returns error when value contains a space anywhere', () => {
      expect(CommonValidator.noSpace(new FormControl('a b'))).toEqual({ noSpace: true });
    });
  });

  describe('noSpaceAtStart', () => {
    it('returns null for empty value', () => {
      expect(CommonValidator.noSpaceAtStart(new FormControl(''))).toBeNull();
    });

    it('returns null when value does not start with a space', () => {
      expect(CommonValidator.noSpaceAtStart(new FormControl('abc '))).toBeNull();
    });

    it('returns error when value starts with a space', () => {
      expect(CommonValidator.noSpaceAtStart(new FormControl(' abc'))).toEqual({ noSpaceAtStart: true });
    });
  });

  describe('noSpaceAtEnd', () => {
    it('returns null for empty value', () => {
      expect(CommonValidator.noSpaceAtEnd(new FormControl(''))).toBeNull();
    });

    it('returns null when value does not end with a space', () => {
      expect(CommonValidator.noSpaceAtEnd(new FormControl(' abc'))).toBeNull();
    });

    it('returns error when value ends with a space', () => {
      expect(CommonValidator.noSpaceAtEnd(new FormControl('abc '))).toEqual({ noSpaceAtEnd: true });
    });
  });

  describe('noSpaceAround', () => {
    it('returns null for empty value', () => {
      expect(CommonValidator.noSpaceAround(new FormControl(''))).toBeNull();
    });

    it('returns null for a value with no leading/trailing space', () => {
      expect(CommonValidator.noSpaceAround(new FormControl('abc'))).toBeNull();
    });

    it('returns error when value starts with a space', () => {
      expect(CommonValidator.noSpaceAround(new FormControl(' abc'))).toEqual({ noSpaceAround: true });
    });

    it('returns error when value ends with a space', () => {
      expect(CommonValidator.noSpaceAround(new FormControl('abc '))).toEqual({ noSpaceAround: true });
    });
  });

  describe('requireObject', () => {
    it('returns error when value is a string', () => {
      expect(CommonValidator.requireObject(new FormControl('abc'))).toEqual({ requireObject: true });
    });

    it('returns null when value is an object', () => {
      expect(CommonValidator.requireObject(new FormControl({ id: '1' }))).toBeNull();
    });

    it('returns null when value is null', () => {
      expect(CommonValidator.requireObject(new FormControl(null))).toBeNull();
    });
  });

  describe('reservedName', () => {
    it('returns null for empty value', () => {
      const validator = CommonValidator.reservedName(['admin', 'root']);
      expect(validator(new FormControl(''))).toBeNull();
    });

    it('returns error when value matches a reserved name (case-insensitive)', () => {
      const validator = CommonValidator.reservedName(['admin', 'root']);
      expect(validator(new FormControl('Admin'))).toEqual({ reservedName: true });
    });

    it('returns null when value does not match any reserved name', () => {
      const validator = CommonValidator.reservedName(['admin', 'root']);
      expect(validator(new FormControl('editor'))).toBeNull();
    });

    it('returns null when value matches ownSkip, even if reserved', () => {
      const validator = CommonValidator.reservedName(['admin', 'root'], 'Admin');
      expect(validator(new FormControl('Admin'))).toBeNull();
    });
  });

  describe('minLength (FormArray)', () => {
    it('returns undefined when control is not a FormArray', () => {
      const validator = CommonValidator.minLength(2);
      expect(validator(new FormControl('not-an-array'))).toBeUndefined();
    });

    it('returns error when FormArray length is below the minimum', () => {
      const validator = CommonValidator.minLength(2);
      const array = new FormArray([new FormControl('a')]);
      expect(validator(array)).toEqual({ minlength: { requiredLength: 2, actualLength: 1 } });
    });

    it('returns null when FormArray length meets the minimum', () => {
      const validator = CommonValidator.minLength(2);
      const array = new FormArray([new FormControl('a'), new FormControl('b')]);
      expect(validator(array)).toBeNull();
    });
  });
});
