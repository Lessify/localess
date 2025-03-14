import { TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { Translation } from '@shared/models/translation.model';
import { TranslationValidator } from '@shared/validators/translation.validator';

@Component({
  selector: 'll-translation-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    TextFieldModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class EditDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    description: this.fb.control('', TranslationValidator.DESCRIPTION),
    labels: this.fb.control([], TranslationValidator.DESCRIPTION),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: Translation,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
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
