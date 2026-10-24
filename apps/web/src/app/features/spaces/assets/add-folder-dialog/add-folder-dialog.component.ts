import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { AssetValidator } from '../asset.validator';
import { AddFolderDialogResult } from './add-folder-dialog.model';

@Component({
  selector: 'll-asset-add-folder-dialog',
  templateUrl: './add-folder-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideSave })],
})
export class AddFolderDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<AddFolderDialogResult>>(BrnDialogRef);

  form: FormGroup = this.fb.group({
    // A name the folder already has is allowed (docs/roadmap/asset-names.md): the folder's list is paged.
    name: this.fb.control('', AssetValidator.NAME),
  });

  save(): void {
    this.dialogRef.close(this.form.value as AddFolderDialogResult);
  }
}
