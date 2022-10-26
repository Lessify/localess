import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class SchemaValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static DESCRIPTION: ValidatorFn[] = [Validators.maxLength(250)];

  // Component
  public static COMPONENT_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static COMPONENT_DISPLAY_NAME: ValidatorFn[] = [
    CommonValidator.noSpaceAtStartAndEnd,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static COMPONENT_DESCRIPTION: ValidatorFn[] = [
    Validators.maxLength(250)
  ];
}
