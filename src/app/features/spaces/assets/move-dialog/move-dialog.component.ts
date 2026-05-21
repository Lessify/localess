import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideHouse } from '@ng-icons/lucide';
import { AssetFolder } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, startWith, switchMap } from 'rxjs';

import { MoveDialogModel } from './move-dialog.model';

@Component({
  selector: 'll-asset-move-dialog',
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmComboboxImports, HlmButtonImports, HlmFieldImports, HlmIconImports],
  providers: [provideIcons({ lucideFolder, lucideHouse })],
})
export class MoveDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assetService = inject(AssetService);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<MoveDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    path: this.fb.control(null, Validators.required),
  });

  // parentPath '~' acts as sentinel — id is never accessed for this item (see onValueChange guard)
  readonly rootFolder: AssetFolder = { name: 'Root', parentPath: '~' } as AssetFolder;

  readonly search = signal('');
  readonly selectedFolder = signal<AssetFolder | null>(null);

  filteredFolders = toSignal(
    toObservable(this.search).pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.assetService.findAllFoldersByName(this.data.spaceId, it, 5)),
    ),
    { initialValue: [] as AssetFolder[] },
  );

  protected readonly displayItem = (item?: AssetFolder): string => (item ? (item.parentPath === '~' ? `${item.name} | ~` : item.name) : '');

  protected readonly noOpFilter = (): boolean => true;

  protected onValueChange(folder: AssetFolder | null): void {
    this.selectedFolder.set(folder);
    if (folder === null) {
      this.form.controls['path'].setValue(null);
      return;
    }
    let parentPath: string;
    if (folder.parentPath === '~') {
      parentPath = '~';
    } else {
      parentPath = folder.parentPath ? `${folder.parentPath}/${folder.id}` : folder.id;
    }
    this.form.controls['path'].setValue(parentPath);
  }
}
