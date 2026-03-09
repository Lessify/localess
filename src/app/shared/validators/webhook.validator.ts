import { ValidatorFn, Validators } from '@angular/forms';
import { CommonValidator } from './common.validator';

export class WebhookValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(50),
  ];

  public static URL: ValidatorFn[] = [Validators.required, Validators.pattern(/^https?:\/\/.+/)];

  public static EVENTS: ValidatorFn[] = [Validators.required, Validators.minLength(1)];
}
