import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { AssetValidator } from '@shared/validators/asset.validator';
import { CommonValidator } from '@shared/validators/common.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { EditFolderDialogContext, EditFolderDialogResult } from './edit-folder-dialog.model';

@Component({
  selector: 'll-asset-edit-folder-dialog',
  templateUrl: './edit-folder-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideSave })],
})
export class EditFolderDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditFolderDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the folder and its sibling names. */
  private readonly context = injectBrnDialogContext<EditFolderDialogContext>();

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.context.reservedNames)]),
  });

  ngOnInit(): void {
    this.form.patchValue(this.context.asset);
  }

  save(): void {
    this.dialogRef.close(this.form.value as EditFolderDialogResult);
  }
}
