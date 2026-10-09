import { ValidatorFn, Validators } from '@angular/forms';
import { CommonValidator } from '@shared/validators/common.validator';

export class AssetValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(250),
  ];
}
