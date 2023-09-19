import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class SpaceValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];

  public static ENVIRONMENT_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];
  public static ENVIRONMENT_URL: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(250)
  ];

  public static UI_COLOR: ValidatorFn[] = [
  ];
}
