import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class SchemaValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAtStartAndEnd,
    Validators.minLength(3),
    Validators.maxLength(30)
  ];
}
