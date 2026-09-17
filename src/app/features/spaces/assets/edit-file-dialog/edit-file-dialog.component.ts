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

import { EditFileDialogContext, EditFileDialogResult } from './edit-file-dialog.model';

@Component({
  selector: 'll-asset-edit-file-dialog',
  templateUrl: './edit-file-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideSave })],
})
export class EditFileDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditFileDialogResult>>(BrnDialogRef);

  /** Required, and read in the template: the extension shown in the name addon comes from it. */
  readonly context = injectBrnDialogContext<EditFileDialogContext>();

  isImage = this.context.asset.type.startsWith('image/');

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.context.reservedNames, this.context.asset.name)]),
    alt: this.fb.control(''),
  });

  ngOnInit(): void {
    this.form.patchValue(this.context.asset);
  }

  save(): void {
    this.dialogRef.close(this.form.value as EditFileDialogResult);
  }
}
