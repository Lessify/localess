import { ValidatorFn, Validators } from '@angular/forms';
import { CommonValidator } from '@shared/validators/common.validator';

export class LocaleValidator {
  public static LOCALE: ValidatorFn[] = [Validators.required, CommonValidator.requireObject];
}
