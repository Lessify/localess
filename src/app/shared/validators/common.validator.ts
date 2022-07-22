import {AbstractControl, ValidationErrors} from '@angular/forms';

export class CommonValidator {
  static noSpace(control: AbstractControl): ValidationErrors | null {
    if ((control.value as string).indexOf(' ') >= 0) {
      return { noSpace: true };
    }
    return null;
  }

  static noSpaceAtStart(control: AbstractControl): ValidationErrors | null {
    if ((control.value as string).startsWith(' ')) {
      return { noSpaceAtStart: true };
    }
    return null;
  }

  static noSpaceAtEnd(control: AbstractControl): ValidationErrors | null {
    if ((control.value as string).endsWith(' ')) {
      return { noSpaceAtEnd: true };
    }
    return null;
  }

  static noSpaceAtStartAndEnd(
    control: AbstractControl
  ): ValidationErrors | null {
    if (
      (control.value as string).startsWith(' ') ||
      (control.value as string).endsWith(' ')
    ) {
      return { noSpaceAtStartAndEnd: true };
    }
    return null;
  }

  static requireMatch(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value === 'string') {
      return { incorrect: true };
    }
    return null;
  }
}
