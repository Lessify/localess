import {ValidatorFn, Validators} from '@angular/forms';
import {CommonPattern, CommonValidator} from './common.validator';

export class SchematicValidator {
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
  public static COMPONENT_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.JSON_NAME),
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static COMPONENT_KIND: ValidatorFn[] = [
    Validators.required
  ];

  public static COMPONENT_DISPLAY_NAME: ValidatorFn[] = [
    CommonValidator.noSpaceAround,
    Validators.maxLength(30)
  ];

  public static COMPONENT_REQUIRED: ValidatorFn[] = [
  ];

  public static COMPONENT_TRANSLATABLE: ValidatorFn[] = [
  ];

  public static COMPONENT_DESCRIPTION: ValidatorFn[] = [
    Validators.maxLength(250)
  ];

  public static COMPONENT_DEFAULT_VALUE: ValidatorFn[] = [
    Validators.maxLength(250)
  ];

  public static COMPONENT_MIN_VALUE: ValidatorFn[] = [
  ];

  public static COMPONENT_MAX_VALUE: ValidatorFn[] = [
  ];

  public static COMPONENT_MIN_LENGTH: ValidatorFn[] = [
    Validators.min(0)
  ];

  public static COMPONENT_MAX_LENGTH: ValidatorFn[] = [
  ];

  public static COMPONENT_SCHEMATIC: ValidatorFn[] = [
  ];

}
