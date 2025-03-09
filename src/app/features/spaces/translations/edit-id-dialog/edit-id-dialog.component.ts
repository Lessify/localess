import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { EditIdDialogModel } from './edit-id-dialog.model';

@Component({
  selector: 'll-translation-edit-id-dialog',
  standalone: true,
  templateUrl: './edit-id-dialog.component.html',
  styleUrls: ['./edit-id-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
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
