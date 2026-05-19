import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload, lucideFolder, lucidePaperclip } from '@ng-icons/lucide';
import { Asset } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, startWith, switchMap } from 'rxjs';

import { ExportDialogModel } from './export-dialog.model';

@Component({
  selector: 'll-asset-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmIconImports, HlmComboboxImports, HlmFieldImports],
  providers: [provideIcons({ lucideCloudDownload, lucideFolder, lucidePaperclip })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assetService = inject(AssetService);
  data = inject<ExportDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    path: this.fb.control<string | undefined>(undefined),
  });

  search = signal('');
  selectedItem = signal<Asset | null>(null);

  filteredAssets = toSignal(
    toObservable(this.search).pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.assetService.findAllByName(this.data.spaceId, it, 5)),
    ),
    { initialValue: [] as Asset[] },
  );

  protected readonly displayItem = (item?: Asset): string => (item ? item.name : '');
  protected readonly noOpFilter = (): boolean => true;

  onValueChange(item: Asset | null): void {
    this.selectedItem.set(item);
    this.form.controls['path'].setValue(item?.id ?? undefined);
  }
}
