import { Injectable } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { CommonPattern } from '@shared/validators/common.validator';

@Injectable({
  providedIn: 'root',
})
export class FormErrorHandlerService {
  errors(errors: ValidationErrors | null | undefined): string | undefined | null {
    if (errors) {
      if (errors['required']) {
        return `Field is required.`;
      }
      if (errors['minlength']) {
        return `Minimum length is ${errors['minlength'].requiredLength}.`;
      }
      if (errors['maxlength']) {
        return `Maximum length is ${errors['maxlength'].requiredLength}.`;
      }
      if (errors['min']) {
        return `Minimum value is ${errors['min'].min}.`;
      }
      if (errors['max']) {
        return `Maximum value is ${errors['max'].max}.`;
      }
      if (errors['pattern']) {
        // ^$
        switch (errors['pattern'].requiredPattern) {
          case `^${CommonPattern.JSON_NAME}$`:
            return `Should contain with a-z, A-Z, 0-9, and underscore (_). Should start with a-z and end with a-z or A-Z or 0-9.`;
          case `^${CommonPattern.URL_SLUG}$`:
            return `Should contain only a-z, A-Z, 0-9, - and underscore (_).`;
          case `^${CommonPattern.ID}$`:
            return `Should contain only a-z, A-Z, 0-9, hyphen (-), dot (.) and underscore (_). Should start with a-z or A-Z and end with a-z or A-Z or 0-9.`;
          default:
            return `Doesn't match the pattern ${errors['pattern'].requiredPattern}`;
        }
      }
      if (errors['email']) {
        return `Field should be email.`;
      }
      if (errors['noSpace']) {
        return `No spaces allowed.`;
      }
      if (errors['noSpaceAtStart']) {
        return `No spaces at start.`;
      }
      if (errors['noSpaceAtEnd']) {
        return `No spaces at end.`;
      }
      if (errors['noSpaceAround']) {
        return `No spaces at start and end.`;
      }
      if (errors['requireObject']) {
        return `Choose value from the drop-down.`;
      }
      if (errors['reservedName']) {
        return `The value is already reserved.`;
      }
      console.log(errors);
    }

    return null;
  }
}
