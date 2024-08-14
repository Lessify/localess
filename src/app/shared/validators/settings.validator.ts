import { ValidatorFn, Validators } from '@angular/forms';
import { CommonValidator } from './common.validator';

export class SettingsValidator {
  public static UI_COLOR: ValidatorFn[] = [];
  public static UI_TEXT: ValidatorFn[] = [CommonValidator.noSpaceAround, Validators.maxLength(10)];
}
