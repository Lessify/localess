import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { resolvePreviewUrl } from '@core/utils/preview-url';
import { SAMPLE_PREVIEW_CONTEXT, SpaceValidator } from '@shared/validators/space.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { EnvironmentDialogContext, EnvironmentDialogResult } from './environment-dialog.model';

/** Adding or editing one Visual Editor environment. */
@Component({
  selector: 'll-environment-dialog',
  templateUrl: './environment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class EnvironmentDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EnvironmentDialogResult>>(BrnDialogRef);

  /** Optional: no context means a new environment. */
  private readonly context = injectBrnDialogContext<EnvironmentDialogContext>({ optional: true });
  readonly isEdit = this.context?.url != null;

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.ENVIRONMENT_NAME),
    url: this.fb.control('', SpaceValidator.ENVIRONMENT_URL),
  });

  ngOnInit(): void {
    if (this.isEdit) {
      this.form.patchValue({ name: this.context?.name, url: this.context?.url });
    }
  }

  /** What a valid environment URL opens for the sample document. */
  exampleUrl(url: string): string {
    return resolvePreviewUrl(url, SAMPLE_PREVIEW_CONTEXT);
  }

  save(): void {
    this.dialogRef.close(this.form.value as EnvironmentDialogResult);
  }
}
