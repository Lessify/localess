import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';

import { TranslationValidator } from '../shared/translation.validator';
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
  /** The value limit the validator and the server enforce, shown by the counter. */
  readonly valueMaxLength = TRANSLATION_VALUE_MAX_LENGTH;
  private readonly dialogRef = inject<BrnDialogRef<AddDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the key check, which the key validator needs. */
  private readonly context = injectBrnDialogContext<AddDialogContext>();

  form: FormGroup = this.fb.group({
    key: this.fb.control('', {
      validators: TranslationValidator.ID,
      asyncValidators: TranslationValidator.keyTaken(this.context.isKeyTaken),
    }),
    description: this.fb.control(undefined, TranslationValidator.DESCRIPTION),
    value: this.fb.control('', TranslationValidator.STRING_VALUE),
    labels: this.fb.control([], TranslationValidator.LABELS),
    autoTranslate: this.fb.control(false),
  });

  /** Why the label typed last was not added; cleared once one is. */
  readonly labelError = signal<string | undefined>(undefined);

  /** Adds the typed label (Enter); an invalid or duplicate one stays in the input with the reason shown. */
  addLabel(input: HTMLInputElement): void {
    const label = input.value.trim();
    if (!label) return;
    const labels: string[] = this.form.controls['labels'].value ?? [];
    const error = TranslationValidator.labelError(label, labels);
    this.labelError.set(error);
    if (error) return;
    this.form.controls['labels'].setValue([...labels, label]);
    input.value = '';
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
