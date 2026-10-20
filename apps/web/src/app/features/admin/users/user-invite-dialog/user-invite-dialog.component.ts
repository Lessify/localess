import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { UserRole } from '@localess/shared';
import { roleDescription, roleLabel, USER_ROLE_OPTIONS } from '@shared/models/user-role.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { UserInviteDialogResult } from './user-invite-dialog.model';

@Component({
  selector: 'll-user-invite-dialog',
  templateUrl: './user-invite-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputImports, HlmSelectImports],
})
export class UserInviteDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<UserInviteDialogResult>>(BrnDialogRef);

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control('', [Validators.minLength(2)]),
    role: this.fb.control<UserRole | null>(null),
  });

  settingsStore = inject(LocalSettingsStore);

  protected readonly roleOptions = USER_ROLE_OPTIONS;
  protected readonly roleItemToString = (value: UserRole | null): string => roleLabel(value);

  private readonly role = toSignal(this.form.controls['role'].valueChanges, { initialValue: this.form.controls['role'].value });
  /** What the chosen role lets the user do. */
  protected readonly roleDescription = computed(() => roleDescription(this.role()));

  save(): void {
    this.dialogRef.close(this.form.value as UserInviteDialogResult);
  }
}
