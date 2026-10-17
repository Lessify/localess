import { ValidatorFn, Validators } from '@angular/forms';
import { TRANSLATION_KEY_MAX_LENGTH, TRANSLATION_KEY_PATTERN, TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { CommonValidator } from '@shared/validators/common.validator';
import { LabelValidator } from '@shared/validators/label.validator';

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
  /** The list of labels: at most as many as the server accepts. Each label is checked when it is added (labelError). */
  public static LABELS: ValidatorFn[] = [Validators.maxLength(LabelValidator.MAX_LABELS)];

  /** Why a label can not be added to `labels`, or undefined when it can. */
  static labelError(label: string, labels: readonly string[]): string | undefined {
    return LabelValidator.error(label, labels);
  }
}
