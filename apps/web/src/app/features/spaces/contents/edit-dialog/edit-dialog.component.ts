import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { CommonValidator } from '@shared/validators/common.validator';
import { ContentValidator } from '@shared/validators/content.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { EditDialogContext, EditDialogResult } from './edit-dialog.model';

@Component({
  selector: 'll-content-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideSave })],
})
export class EditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditDialogResult>>(BrnDialogRef);

  /** Required: the content being edited plus the sibling names and slugs to validate against. */
  private readonly context = injectBrnDialogContext<EditDialogContext>();

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [
      ...ContentValidator.NAME,
      CommonValidator.reservedName(this.context.reservedNames, this.context.content.name),
    ]),
    slug: this.fb.control('', [
      ...ContentValidator.SLUG,
      CommonValidator.reservedName(this.context.reservedSlugs, this.context.content.slug),
    ]),
  });

  ngOnInit(): void {
    this.form.patchValue(this.context.content);
  }

  save(): void {
    this.dialogRef.close(this.form.value as EditDialogResult);
  }
}
