import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { TokenForm } from '@shared/models/token.model';
import { TokenValidator } from '@shared/validators/token.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

interface PermissionItem {
  id: string;
  label: string;
  desc: string;
}

interface PermissionGroup {
  label: string;
  permissions: PermissionItem[];
}

@Component({
  selector: 'll-token-dialog',
  templateUrl: './token-dialog.component.html',
  styleUrls: ['./token-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmLabelImports,
    HlmSeparatorImports,
  ],
})
export class TokenDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<TokenForm | undefined>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    name: this.fb.control<string>('', TokenValidator.NAME),
    permissions: this.fb.control<string[]>([], TokenValidator.PERMISSIONS),
  });

  protected readonly permissionGroups: PermissionGroup[] = [
    {
      label: 'Translation',
      permissions: [
        { id: 'TRANSLATION_PUBLIC', label: 'Public', desc: 'Access to published only version.' },
        { id: 'TRANSLATION_DRAFT', label: 'Draft', desc: 'Access to draft and published version.' },
      ],
    },
    {
      label: 'Content',
      permissions: [
        { id: 'CONTENT_PUBLIC', label: 'Public', desc: 'Access to published only version.' },
        { id: 'CONTENT_DRAFT', label: 'Draft', desc: 'Access to draft and published version.' },
      ],
    },
    {
      label: 'Development',
      permissions: [
        { id: 'DEV_TOOLS', label: 'Development Tools', desc: 'Access to development tools like CLI, where you can manage and sync data.' },
      ],
    },
  ];

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }

  isPermissionSelected(permission: string): boolean {
    return this.form.controls['permissions'].value?.includes(permission) ?? false;
  }

  togglePermission(permission: string, checked: boolean): void {
    const current: string[] = this.form.controls['permissions'].value ?? [];
    const updated = checked ? [...current, permission] : current.filter((p: string) => p !== permission);
    this.form.controls['permissions'].setValue(updated);
  }
}
