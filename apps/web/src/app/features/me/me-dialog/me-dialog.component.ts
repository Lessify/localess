import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { MeDialogContext, MeDialogResult } from './me-dialog.model';

@Component({
  selector: 'll-me-dialog',
  templateUrl: './me-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `hlm-dialog-content` is a grid whose single item is this host, so its `gap-4` never reaches the
  // parts inside - set the spacing here or header/form/footer end up flush against each other.
  host: { class: 'grid gap-4' },
  imports: [ReactiveFormsModule, HlmDialogImports, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MeDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<MeDialogResult>>(BrnDialogRef);

  /** Optional to keep the pre-migration behaviour: an empty profile opens an empty form. */
  private readonly context = injectBrnDialogContext<MeDialogContext>({ optional: true });

  form: FormGroup = this.fb.group({
    displayName: this.fb.control(undefined),
    photoURL: this.fb.control(undefined),
  });

  ngOnInit(): void {
    // `?.` because the injection above is optional: without it this throws for a dialog opened
    // with no context at all, which is the case the option exists for.
    if (this.context != null) {
      this.form.patchValue(this.context);
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as MeDialogResult);
  }
}
