import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';
import { CommonValidator } from '@shared/validators/common.validator';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';

import { AddDialogContext, AddDialogResult } from './add-dialog.model';

@Component({
  selector: 'll-translation-add-dialog',
  templateUrl: './add-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSwitchImports,
  ],
  providers: [provideIcons({ lucideCircleX })],
})
export class AddDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<AddDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the ids already taken, which the id validator needs. */
  private readonly context = injectBrnDialogContext<AddDialogContext>();

  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.context.reservedIds)]),
    type: this.fb.control('STRING', TranslationValidator.TYPE),
    description: this.fb.control(undefined, TranslationValidator.DESCRIPTION),
    value: this.fb.control('', TranslationValidator.STRING_VALUE),
    labels: this.fb.control([], TranslationValidator.LABEL),
    autoTranslate: this.fb.control(false),
  });

  addLabel(value: string): void {
    if (value.trim()) {
      const labels: string[] = this.form.controls['labels'].value;
      if (labels instanceof Array) {
        this.form.controls['labels'].setValue([...labels, value.trim()]);
      } else {
        this.form.controls['labels'].setValue([value.trim()]);
      }
    }
  }

  removeLabel(label: string): void {
    const labels: string[] = this.form.controls['labels'].value;
    if (labels instanceof Array) {
      this.form.controls['labels'].setValue(labels.filter(l => l !== label));
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as AddDialogResult);
  }
}
