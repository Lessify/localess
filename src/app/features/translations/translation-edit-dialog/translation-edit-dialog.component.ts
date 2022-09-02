import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MatChipInputEvent} from '@angular/material/chips';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TranslationValidator} from '@shared/validators/translation.validator';
import {Translation} from '@shared/models/translation.model';

@Component({
  selector: 'll-translation-edit-dialog',
  templateUrl: './translation-edit-dialog.component.html',
  styleUrls: ['./translation-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationEditDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    description: this.fb.control('', TranslationValidator.DESCRIPTION),
    labels: this.fb.control([], TranslationValidator.DESCRIPTION)
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: Translation
  ) {
  }

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
