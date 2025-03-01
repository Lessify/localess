import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { EditIdDialogModel } from './edit-id-dialog.model';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-translation-edit-id-dialog',
  standalone: true,
  templateUrl: './edit-id-dialog.component.html',
  styleUrls: ['./edit-id-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormField, MatInput, MatButton],
})
export class EditIdDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.data.reservedIds)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: EditIdDialogModel,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue({ id: this.data.id });
    }
  }
}
