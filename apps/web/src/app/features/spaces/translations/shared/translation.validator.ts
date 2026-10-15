import { ValidatorFn, Validators } from '@angular/forms';
import { TRANSLATION_KEY_MAX_LENGTH, TRANSLATION_KEY_PATTERN, TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { CommonValidator } from '@shared/validators/common.validator';

/** The server's limit (`zLabels`, apps/server/src/infra/http/zod.ts). */
const TRANSLATION_LABELS_MAX = 100;

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
  public static LABELS: ValidatorFn[] = [Validators.maxLength(TRANSLATION_LABELS_MAX)];

  /** Why a label can not be added to `labels`, or undefined when it can. */
  static labelError(label: string, labels: readonly string[]): string | undefined {
    if (/\s/.test(label)) return 'A label can not contain spaces.';
    if (label.length < 2) return 'A label needs at least 2 characters.';
    if (label.length > 50) return 'A label can have at most 50 characters.';
    if (labels.includes(label)) return `'${label}' is already added.`;
    return undefined;
  }
}
