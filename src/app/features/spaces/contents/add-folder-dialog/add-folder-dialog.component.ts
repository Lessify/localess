import { ChangeDetectionStrategy, Component, effect, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AddFolderDialogModel } from './add-folder-dialog.model';
import { ContentValidator } from '@shared/validators/content.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { NameUtils } from '@core/utils/name-utils.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'll-content-add-folder-dialog',
  standalone: true,
  templateUrl: './add-folder-dialog.component.html',
  styleUrls: ['./add-folder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatIconButton,
    MatIcon,
    MatButton,
  ],
})
export class AddFolderDialogComponent {
  form = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.data.reservedSlugs)]),
  });
  formNameValue = toSignal(this.form.controls['name'].valueChanges);
  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: AddFolderDialogModel,
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
