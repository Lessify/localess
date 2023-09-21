import { ValidatorFn, Validators } from '@angular/forms';
import { CommonPattern, CommonValidator } from './common.validator';

export class ContentValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(50),
  ];

  public static SLUG: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.URL_SLUG),
    Validators.minLength(3),
    Validators.maxLength(50),
  ];

  public static SCHEMA: ValidatorFn[] = [Validators.required];
}
