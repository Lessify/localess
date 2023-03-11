import {ValidatorFn, Validators} from '@angular/forms';
import {CommonPattern, CommonValidator} from './common.validator';

export class SchemasValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.JSON_NAME),
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static TYPE: ValidatorFn[] = [
    Validators.required,
  ];

  public static DISPLAY_NAME: ValidatorFn[] = [
    CommonValidator.noSpaceAround,
    Validators.maxLength(30)
  ];

  // Component
  public static FIELD_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.JSON_NAME),
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static FIELD_KIND: ValidatorFn[] = [
    Validators.required
  ];

  public static FIELD_DISPLAY_NAME: ValidatorFn[] = [
    CommonValidator.noSpaceAround,
    Validators.maxLength(30)
  ];

  public static FIELD_REQUIRED: ValidatorFn[] = [
  ];

  public static FIELD_TRANSLATABLE: ValidatorFn[] = [
  ];

  public static FIELD_DESCRIPTION: ValidatorFn[] = [
    Validators.maxLength(250)
  ];

  public static FIELD_DEFAULT_VALUE: ValidatorFn[] = [
    Validators.maxLength(250)
  ];

  public static FIELD_MIN_VALUE: ValidatorFn[] = [
  ];

  public static FIELD_MAX_VALUE: ValidatorFn[] = [
  ];

  public static FIELD_MIN_VALUES: ValidatorFn[] = [
    Validators.min(0)
  ];

  public static FIELD_MAX_VALUES: ValidatorFn[] = [
  ];

  public static FIELD_MIN_LENGTH: ValidatorFn[] = [
    Validators.min(0)
  ];

  public static FIELD_MAX_LENGTH: ValidatorFn[] = [
  ];

  public static FIELD_OPTIONS: ValidatorFn[] = [
    Validators.required,
  ];

  public static FIELD_OPTION_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(1),
    Validators.maxLength(30)
  ];

  public static FIELD_OPTION_VALUE: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(1),
    Validators.maxLength(30)
  ];

  public static FIELD_SCHEMA: ValidatorFn[] = [
    Validators.required,
  ];

}
