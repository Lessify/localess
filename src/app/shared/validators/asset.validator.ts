import {ValidatorFn, Validators} from '@angular/forms';
import {CommonPattern, CommonValidator} from './common.validator';

export class AssetValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(50)
  ];

}
