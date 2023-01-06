import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class LocaleValidator {
  public static LOCALE: ValidatorFn[] = [
    Validators.required,
    CommonValidator.requireObject
  ];
}
