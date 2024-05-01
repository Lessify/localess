import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

function isEmptyInputValue(value: any): boolean {
  /**
   * Check if the object is a string or array before evaluating the length attribute.
   * This avoids falsely rejecting objects that contain a custom length attribute.
   * For example, the object {id: 1, length: 0, width: 0} should not be returned as empty.
   */
  return value == null || ((typeof value === 'string' || Array.isArray(value)) && value.length === 0);
}

export class CommonValidator {
  static noSpace(control: AbstractControl): ValidationErrors | null {
    if (isEmptyInputValue(control.value)) {
      return null; // don't validate empty values to allow optional controls
    }
    if ((control.value as string).indexOf(' ') >= 0) {
      return { noSpace: true };
    }
    return null;
  }

  static noSpaceAtStart(control: AbstractControl): ValidationErrors | null {
    if (isEmptyInputValue(control.value)) {
      return null; // don't validate empty values to allow optional controls
    }
    if ((control.value as string).startsWith(' ')) {
      return { noSpaceAtStart: true };
    }
    return null;
  }

  static noSpaceAtEnd(control: AbstractControl): ValidationErrors | null {
    if (isEmptyInputValue(control.value)) {
      return null; // don't validate empty values to allow optional controls
    }
    if ((control.value as string).endsWith(' ')) {
      return { noSpaceAtEnd: true };
    }
    return null;
  }

  static noSpaceAround(control: AbstractControl): ValidationErrors | null {
    if (isEmptyInputValue(control.value)) {
      return null; // don't validate empty values to allow optional controls
    }
    if ((control.value as string).startsWith(' ') || (control.value as string).endsWith(' ')) {
      return { noSpaceAround: true };
    }
    return null;
  }

  static requireObject(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value === 'string') {
      return { requireObject: true };
    }
    return null;
  }

  // TODO Review SLUG pattern
  static reservedName(names: string[], ownSkip?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (isEmptyInputValue(control.value)) {
        return null; // don't validate empty values to allow optional controls
      }
      if (ownSkip && ownSkip === control.value) {
        return null;
      }
      if (names.some(it => it === control.value)) {
        return { reservedName: true };
      }
      return null;
    };
  }

  static minLength(min: number): ValidatorFn | any {
    return (control: AbstractControl[]) => {
      if (!(control instanceof FormArray)) return;
      return control.length < min ? { minlength: { requiredLength: min, actualLength: control.length } } : null;
    };
  }
}

export const RESERVED_NAMES = ['_id', 'schema', 'kind'];

export enum CommonPattern {
  JSON_NAME = '[a-z]+[a-zA-Z0-9_]*[a-zA-Z0-9]+',
  URL_SLUG = '[a-zA-Z0-9-_]+',
  ID = '[a-zA-Z]+[a-zA-Z0-9-_.]*[a-zA-Z0-9]+',
  //URL = ''//'(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?'
}
