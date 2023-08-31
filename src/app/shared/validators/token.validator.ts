import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class TokenValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];
}
