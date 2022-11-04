import {Injectable} from '@angular/core';
import {AbstractControl, ValidationErrors} from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class FormErrorHandlerService {

  controlError(control: AbstractControl): string | undefined | null {
    return this.errors(control.errors)
  }

  private errors(errors: ValidationErrors | null): string | undefined | null {
    if (errors) {
      if (errors['minlength']) {
        return `Minimum length is ${errors['minlength'].requiredLength}.`
      }
      if (errors['maxlength']) {
        return `Maximum length is ${errors['maxlength'].requiredLength}.`
      }
      if (errors['min']) {
        return `Minimum value is ${errors['min'].min}.`
      }
      if (errors['max']) {
        return `Maximum value is ${errors['max'].max}.`
      }
      if (errors['required']) {
        return `Field is required.`
      }
      if (errors['email']) {
        return `Field should be email.`
      }
      if (errors['noSpace']) {
        return `No spaces allowed.`
      }
      if (errors['noSpaceAtStart']) {
        return `No spaces at start.`
      }
      if (errors['noSpaceAtEnd']) {
        return `No spaces at end.`
      }
      if (errors['noSpaceAround']) {
        return `No spaces at start and end.`
      }
      console.log(errors);
    }

    return null;
  }

}
