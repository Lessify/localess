import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { UserRole } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { NO_ROLE, UserRoleChoiceComponent } from '../user-role-choice/user-role-choice.component';
import { UserInviteDialogResult } from './user-invite-dialog.model';

@Component({
  selector: 'll-user-invite-dialog',
  templateUrl: './user-invite-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputImports, UserRoleChoiceComponent],
})
export class UserInviteDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<UserInviteDialogResult>>(BrnDialogRef);

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control('', [Validators.minLength(2)]),
    role: this.fb.control<string>(NO_ROLE, { nonNullable: true }),
  });

  settingsStore = inject(LocalSettingsStore);

  protected readonly roleControl = this.form.controls['role'] as FormControl<string>;

  /** None (`NO_ROLE`) is answered as `null`. */
  save(): void {
    const { role, ...rest } = this.form.value as Omit<UserInviteDialogResult, 'role'> & { role: string };
    this.dialogRef.close({ ...rest, role: (role || null) as UserRole | null });
  }
}
