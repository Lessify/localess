import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { UserRole } from '@localess/shared';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';

import { NO_ROLE, UserRoleChoiceComponent } from '../user-role-choice/user-role-choice.component';
import { UserDialogContext, UserDialogResult } from './user-dialog.model';

@Component({
  selector: 'll-user-dialog',
  templateUrl: './user-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, UserRoleChoiceComponent],
})
export class UserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<UserDialogResult>>(BrnDialogRef);

  /** Optional so a dialog opened without a context still renders, with an unset role. */
  private readonly context = injectBrnDialogContext<UserDialogContext>({ optional: true });

  form: FormGroup = this.fb.group({
    role: this.fb.control<string>(NO_ROLE, { nonNullable: true }),
  });

  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    // `?.` because the injection above is optional - without it this throws when no context was passed.
    if (this.context != null) {
      this.form.patchValue({ role: this.context.role ?? NO_ROLE });
    }
  }

  protected readonly roleControl = this.form.controls['role'] as FormControl<string>;

  /** None (`NO_ROLE`) is answered as `null`. */
  save(): void {
    const role = this.roleControl.value;
    this.dialogRef.close({ role: (role || null) as UserRole | null });
  }
}
