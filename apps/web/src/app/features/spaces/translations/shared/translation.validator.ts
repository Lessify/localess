import { ValidatorFn, Validators } from '@angular/forms';
import { TRANSLATION_KEY_MAX_LENGTH, TRANSLATION_KEY_PATTERN, TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { CommonValidator } from '@shared/validators/common.validator';

export class TranslationValidator {
  public static ID: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(TRANSLATION_KEY_PATTERN),
    Validators.minLength(2),
    Validators.maxLength(TRANSLATION_KEY_MAX_LENGTH),
  ];
  public static STRING_VALUE: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(TRANSLATION_VALUE_MAX_LENGTH),
  ];
  public static DESCRIPTION: ValidatorFn[] = [Validators.maxLength(250)];
  public static LABEL: ValidatorFn[] = [CommonValidator.noSpace, Validators.minLength(2), Validators.maxLength(50)];
}
