import { ValidatorFn, Validators } from '@angular/forms';

import { CommonValidator } from './common.validator';

export class TokenValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30),
  ];
  public static PERMISSIONS: ValidatorFn[] = [Validators.required, Validators.minLength(1)];
  public static CACHE_TTL: ValidatorFn[] = [(Validators.min(0), Validators.max(31536000))];
}
