import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NameUtils } from '@core/utils/name-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideWandSparkles } from '@ng-icons/lucide';
import { CommonValidator } from '@shared/validators/common.validator';
import { ContentValidator } from '@shared/validators/content.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { AddFolderDialogContext, AddFolderDialogResult } from './add-folder-dialog.model';

@Component({
  selector: 'll-content-add-folder-dialog',
  templateUrl: './add-folder-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideWandSparkles })],
})
export class AddFolderDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<AddFolderDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the sibling names and slugs the validators check against. */
  private readonly context = injectBrnDialogContext<AddFolderDialogContext>();

  form = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.context.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.context.reservedSlugs)]),
  });
  formNameValue = toSignal(this.form.controls['name'].valueChanges);

  constructor() {
    effect(() => {
      if (!this.form.controls['slug'].touched) {
        this.form.controls['slug'].setValue(NameUtils.slug(this.formNameValue() || ''));
      }
    });
  }

  normalizeSlug(): void {
    if (this.form.value.slug) {
      this.form.controls['slug'].setValue(NameUtils.slug(this.form.value.slug));
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as AddFolderDialogResult);
  }
}
