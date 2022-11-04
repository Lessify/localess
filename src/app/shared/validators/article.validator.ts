import {ValidatorFn, Validators} from '@angular/forms';
import {CommonValidator} from './common.validator';

export class ArticleValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(50)
  ];

  public static SLUG: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(50)
  ];

  public static SCHEMA: ValidatorFn[] = [
    Validators.required
  ];

}
