import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload, lucideFolder, lucidePaperclip } from '@ng-icons/lucide';
import { Asset } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, startWith, switchMap } from 'rxjs';

import { ExportDialogContext, ExportDialogResult } from './export-dialog.model';

@Component({
  selector: 'll-asset-export-dialog',
  templateUrl: './export-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmIconImports, HlmComboboxImports, HlmFieldImports],
  providers: [provideIcons({ lucideCloudDownload, lucideFolder, lucidePaperclip })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assetService = inject(AssetService);
  private readonly dialogRef = inject<BrnDialogRef<ExportDialogResult>>(BrnDialogRef);

  /** Required: the asset search is scoped to the space it carries. */
  private readonly context = injectBrnDialogContext<ExportDialogContext>();

  form: FormGroup = this.fb.group({
    path: this.fb.control<string | undefined>(undefined),
  });

  search = signal('');
  selectedItem = signal<Asset | null>(null);

  filteredAssets = toSignal(
    toObservable(this.search).pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.assetService.findAllByName(this.context.spaceId, it, 5)),
    ),
    { initialValue: [] as Asset[] },
  );

  protected readonly displayItem = (item?: Asset): string => (item ? item.name : '');
  protected readonly noOpFilter = (): boolean => true;

  onValueChange(item: Asset | null): void {
    this.selectedItem.set(item);
    this.form.controls['path'].setValue(item?.id ?? undefined);
  }

  save(): void {
    this.dialogRef.close(this.form.value as ExportDialogResult);
  }
}
