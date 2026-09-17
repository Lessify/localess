import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { EditDialogContext, EditDialogResult } from './edit-dialog.model';

@Component({
  selector: 'll-translation-edit-dialog',
  templateUrl: './edit-dialog.component.html',
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
  ],
  providers: [provideIcons({ lucideCircleX })],
})
export class EditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditDialogResult>>(BrnDialogRef);

  /** Optional so a dialog opened without a context still renders an empty form. */
  private readonly context = injectBrnDialogContext<EditDialogContext>({ optional: true });

  form: FormGroup = this.fb.group({
    description: this.fb.control('', TranslationValidator.DESCRIPTION),
    labels: this.fb.control([], TranslationValidator.DESCRIPTION),
  });

  ngOnInit(): void {
    // `?.` because the injection above is optional - without it this throws when no context was passed.
    if (this.context != null) {
      this.form.patchValue(this.context);
    }
  }

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
    this.dialogRef.close(this.form.value as EditDialogResult);
  }
}
