import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { AddDialogModel } from './add-dialog.model';
import { CommonValidator } from '@shared/validators/common.validator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-translation-add-dialog',
  standalone: true,
  templateUrl: './add-dialog.component.html',
  styleUrls: ['./add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInput,
    MatSelectModule,
    TextFieldModule,
    MatChipsModule,
    MatIcon,
    MatCheckbox,
    MatButton,
  ],
})
export class AddDialogComponent {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  translationTypes: string[] = ['STRING', 'PLURAL', 'ARRAY'];
  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.data.reservedIds)]),
    type: this.fb.control('STRING', TranslationValidator.TYPE),
    description: this.fb.control(undefined, TranslationValidator.DESCRIPTION),
    value: this.fb.control('', TranslationValidator.STRING_VALUE),
    labels: this.fb.control([], TranslationValidator.LABEL),
    autoTranslate: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: AddDialogModel,
  ) {
    this.form.valueChanges.subscribe(it => console.log(it));
  }

  addLabel(event: MatChipInputEvent): void {
    const input = event.chipInput?.inputElement;
    const value: string = event.value;

    if ((value || '').trim()) {
      const labels: any = this.form.controls['labels'].value;
      if (labels instanceof Array) {
        labels.push(value);
      } else {
        this.form.controls['labels'].setValue([value]);
      }
    }
    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeLabel(label: string): void {
    const labels: any = this.form.controls['labels'].value;
    if (labels instanceof Array) {
      const index: number = labels.indexOf(label);
      labels.splice(index, 1);
    }
  }
}
