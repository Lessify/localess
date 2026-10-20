import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { UserRole } from '@localess/shared';
import { roleDescription, roleLabel, USER_ROLE_OPTIONS } from '@shared/models/user-role.model';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { UserDialogContext, UserDialogResult } from './user-dialog.model';

@Component({
  selector: 'll-user-dialog',
  templateUrl: './user-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmSelectImports],
})
export class UserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<UserDialogResult>>(BrnDialogRef);

  /** Optional so a dialog opened without a context still renders, with an unset role. */
  private readonly context = injectBrnDialogContext<UserDialogContext>({ optional: true });

  form: FormGroup = this.fb.group({
    role: this.fb.control<UserRole | null>(null),
  });

  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    // `?.` because the injection above is optional - without it this throws when no context was passed.
    if (this.context != null) {
      this.form.patchValue({ role: this.context.role ?? null });
    }
  }

  protected readonly roleOptions = USER_ROLE_OPTIONS;
  protected readonly roleItemToString = (value: UserRole | null): string => roleLabel(value);

  private readonly role = toSignal(this.form.controls['role'].valueChanges, { initialValue: this.form.controls['role'].value });
  /** What the chosen role lets the user do. */
  protected readonly roleDescription = computed(() => roleDescription(this.role()));

  save(): void {
    this.dialogRef.close(this.form.value as UserDialogResult);
  }
}
