import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class TranslationValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(2),
    Validators.maxLength(150)
  ];
  public static STRING_VALUE: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(1000)
  ];
  public static PLURAL_VALUE: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(300)
  ];
  public static ARRAY_VALUE: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(150)
  ];
  public static DESCRIPTION: ValidatorFn[] = [Validators.maxLength(250)];
  public static TYPE: ValidatorFn[] = [Validators.required];
  public static LABEL: ValidatorFn[] = [
    CommonValidator.noSpace,
    Validators.minLength(2),
    Validators.maxLength(50)
  ];
}
