import { ChangeDetectionStrategy, Component, effect, Inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NameUtils } from '@core/utils/name-utils.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { ContentValidator } from '@shared/validators/content.validator';
import { AddDocumentDialogModel } from './add-document-dialog.model';

@Component({
  selector: 'll-content-add-document-dialog',
  templateUrl: './add-document-dialog.component.html',
  styleUrls: ['./add-document-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule],
})
export class AddDocumentDialogComponent {
  form = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.data.reservedSlugs)]),
    schema: this.fb.control(undefined, ContentValidator.SCHEMA),
  });
  formNameValue = toSignal(this.form.controls['name'].valueChanges);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: AddDocumentDialogModel,
  ) {
    effect(() => {
      if (!this.form.controls['slug'].touched) {
        this.form.controls['slug'].setValue(NameUtils.slug(this.formNameValue() || ''));
      }
    });
  }

  normalizeSlug() {
    if (this.form.value.slug) {
      this.form.controls['slug'].setValue(NameUtils.slug(this.form.value.slug));
    }
  }
}
