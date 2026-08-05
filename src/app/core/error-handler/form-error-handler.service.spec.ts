import { TestBed } from '@angular/core/testing';
import { CommonPattern } from '@shared/validators/common.validator';

import { FormErrorHandlerService } from './form-error-handler.service';

describe('FormErrorHandlerService', () => {
  function setup() {
    return TestBed.inject(FormErrorHandlerService);
  }

  it('returns null when there are no errors', () => {
    const service = setup();
    expect(service.errors(null)).toBeNull();
    expect(service.errors(undefined)).toBeNull();
    expect(service.errors({})).toBeNull();
  });

  it('required', () => {
    const service = setup();
    expect(service.errors({ required: true })).toBe('Field is required.');
  });

  it('minlength includes the required length', () => {
    const service = setup();
    expect(service.errors({ minlength: { requiredLength: 5 } })).toBe('Minimum length is 5.');
  });

  it('maxlength includes the required length', () => {
    const service = setup();
    expect(service.errors({ maxlength: { requiredLength: 10 } })).toBe('Maximum length is 10.');
  });

  it('min includes the minimum value', () => {
    const service = setup();
    expect(service.errors({ min: { min: 1 } })).toBe('Minimum value is 1.');
  });

  it('max includes the maximum value', () => {
    const service = setup();
    expect(service.errors({ max: { max: 100 } })).toBe('Maximum value is 100.');
  });

  it('email', () => {
    const service = setup();
    expect(service.errors({ email: true })).toBe('Field should be email.');
  });

  it('noSpace / noSpaceAtStart / noSpaceAtEnd / noSpaceAround', () => {
    const service = setup();
    expect(service.errors({ noSpace: true })).toBe('No spaces allowed.');
    expect(service.errors({ noSpaceAtStart: true })).toBe('No spaces at start.');
    expect(service.errors({ noSpaceAtEnd: true })).toBe('No spaces at end.');
    expect(service.errors({ noSpaceAround: true })).toBe('No spaces at start and end.');
  });

  it('requireObject', () => {
    const service = setup();
    expect(service.errors({ requireObject: true })).toBe('Choose value from the drop-down.');
  });

  it('reservedName', () => {
    const service = setup();
    expect(service.errors({ reservedName: true })).toBe('The value is already reserved.');
  });

  it('pattern falls back to a generic message for an unrecognized pattern', () => {
    const service = setup();
    expect(service.errors({ pattern: { requiredPattern: '^unknown$' } })).toBe("Doesn't match the pattern ^unknown$");
  });

  it('pattern recognizes JSON_NAME', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: `^${CommonPattern.JSON_NAME}$` } });
    expect(message).toMatch(/^Should contain with a-z, A-Z, 0-9, and underscore/);
  });

  it('pattern recognizes URL_SLUG', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: `^${CommonPattern.URL_SLUG}$` } });
    expect(message).toMatch(/^Should contain with a-z, A-Z, 0-9, - and underscore/);
  });

  it('pattern recognizes ID', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: `^${CommonPattern.ID}$` } });
    expect(message).toMatch(/^Should contain only a-z, A-Z, 0-9, hyphen \(-\), dot \(\.\) and underscore/);
  });

  it('pattern recognizes SCHEMA_ID', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: `^${CommonPattern.SCHEMA_ID}$` } });
    expect(message).toMatch(/^Should contain only a-z, A-Z, and 0-9/);
  });

  it('pattern recognizes ENUM_VALUE', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: `^${CommonPattern.ENUM_VALUE}$` } });
    expect(message).toMatch(/^Should contain only a-z, A-Z, 0-9 and underscore/);
  });

  it('pattern recognizes SCHEMA_FIELD_NAME_TRANSLATION', () => {
    const service = setup();
    const message = service.errors({ pattern: { requiredPattern: CommonPattern.SCHEMA_FIELD_NAME_TRANSLATION } });
    expect(message).toBe('_i18n_ is reserved for translations. Please avoid using it in the field name.');
  });

  it('returns null for an unrecognized error key', () => {
    const service = setup();
    expect(service.errors({ somethingElse: true })).toBeNull();
  });
});
