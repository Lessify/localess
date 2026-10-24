import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TRANSLATION_KEY_MAX_LENGTH, TRANSLATION_KEY_PATTERN, TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { CommonValidator } from '@shared/validators/common.validator';
import { LabelValidator } from '@shared/validators/label.validator';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export class TranslationValidator {
  /**
   * A key the space already has (`reservedName`), asked of the server once typing pauses: the key is unique per space,
   * exactly as typed. `own`: the key being renamed, which is not taken by itself. A failed check lets the server decide.
   */
  static keyTaken(isKeyTaken: (key: string) => Observable<boolean>, own?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const key = typeof control.value === 'string' ? control.value : '';
      // Its own key, also in another letter case (a rename that only changes the case), is not taken.
      if (!key || key.toLowerCase() === own?.toLowerCase()) return of(null);
      return timer(300).pipe(
        switchMap(() => isKeyTaken(key)),
        map(taken => (taken ? { reservedName: true } : null)),
        catchError(() => of(null)),
      );
    };
  }

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
