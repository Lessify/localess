import { ValidatorFn, Validators } from '@angular/forms';
import { CommonPattern, CommonValidator } from '@shared/validators/common.validator';

export class ContentValidator {
  /** Name and slug limit, shared by the add and edit dialogs (counter, `maxlength`, validator). */
  public static readonly MAX_LENGTH = 250;

  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(2),
    Validators.maxLength(ContentValidator.MAX_LENGTH),
  ];

  public static SLUG: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.URL_SLUG),
    Validators.minLength(2),
    Validators.maxLength(ContentValidator.MAX_LENGTH),
  ];

  public static SCHEMA: ValidatorFn[] = [Validators.required];
}
