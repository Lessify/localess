import { ChangeDetectionStrategy, Component, effect, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { AddDocumentDialogModel } from './add-document-dialog.model';
import { ContentValidator } from '@shared/validators/content.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { NameUtils } from '@core/utils/name-utils.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-content-add-document-dialog',
  templateUrl: './add-document-dialog.component.html',
  styleUrls: ['./add-document-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    @Inject(MAT_DIALOG_DATA) public data: AddDocumentDialogModel
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
