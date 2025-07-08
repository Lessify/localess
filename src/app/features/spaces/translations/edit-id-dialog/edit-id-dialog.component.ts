import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
  templateUrl: './edit-id-dialog.component.html',
  styleUrls: ['./edit-id-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class EditIdDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<EditIdDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.data.reservedIds)]),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue({ id: this.data.id });
    }
  }
}
