import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { USER_PERMISSION_GROUPS } from '../user-permissions';
import { UserDialogModel } from './user-dialog.model';

@Component({
  selector: 'll-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmSelectImports,
    HlmSwitchImports,
    HlmCheckboxImports,
    HlmLabelImports,
    HlmSeparatorImports,
    HlmTooltipImports,
  ],
})
export class UserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<UserDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    role: this.fb.control<string | undefined>(undefined),
    permissions: this.fb.control<string[] | undefined>(undefined),
    lock: this.fb.control<boolean | undefined>(undefined),
  });

  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue({ ...this.data, role: this.data.role ?? null });
    }
  }

  protected readonly permissionGroups = USER_PERMISSION_GROUPS;

  protected readonly roleItemToString = (value: string): string => {
    const labels: Record<string, string> = { custom: 'Custom', admin: 'Admin' };
    return labels[value] ?? value;
  };

  isPermissionSelected(permission: string): boolean {
    return this.form.controls['permissions'].value?.includes(permission) ?? false;
  }

  togglePermission(permission: string, checked: boolean): void {
    const current: string[] = this.form.controls['permissions'].value ?? [];
    const updated = checked ? [...current, permission] : current.filter((p: string) => p !== permission);
    this.form.controls['permissions'].setValue(updated);
  }
}
