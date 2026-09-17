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
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { AddDocumentDialogContext, AddDocumentDialogResult } from './add-document-dialog.model';

@Component({
  selector: 'll-content-add-document-dialog',
  templateUrl: './add-document-dialog.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSelectImports,
  ],
  providers: [provideIcons({ lucideWandSparkles })],
})
export class AddDocumentDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<AddDocumentDialogResult>>(BrnDialogRef);

  /** Required, and read in the template: the schema picker is built from it. */
  readonly context = injectBrnDialogContext<AddDocumentDialogContext>();

  form = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.context.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.context.reservedSlugs)]),
    // Typed explicitly: `control(undefined)` alone infers `null | undefined`, which never overlaps
    // with the schema id this dialog actually returns.
    schema: this.fb.control<string | undefined>(undefined, ContentValidator.SCHEMA),
  });
  formNameValue = toSignal(this.form.controls['name'].valueChanges);

  constructor() {
    effect(() => {
      if (!this.form.controls['slug'].touched) {
        this.form.controls['slug'].setValue(NameUtils.slug(this.formNameValue() || ''));
      }
    });
  }

  protected readonly schemaItemToString = (value: string): string => {
    return this.context.schemas.find(s => s.id === value)?.displayName || value;
  };

  normalizeSlug(): void {
    if (this.form.value.slug) {
      this.form.controls['slug'].setValue(NameUtils.slug(this.form.value.slug));
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as AddDocumentDialogResult);
  }
}
