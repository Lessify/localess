import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFile, lucideFilePlusCorner, lucideGripVertical, lucideLanguages, lucideTrash } from '@ng-icons/lucide';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogModel } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { ImagePreviewDirective } from '@shared/directives/image-preview.directive';
import { Asset, AssetFile, AssetKind } from '@shared/models/asset.model';
import { SchemaFieldAssets, SchemaFieldKind } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { AssetService } from '@shared/services/asset.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { AssetsSelectDialogComponent, AssetsSelectDialogModel } from '../assets-select-dialog';

@Component({
  selector: 'll-assets-select',
  templateUrl: './assets-select.component.html',
  styleUrls: ['./assets-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    ImagePreviewDirective,
    CommonModule,
    FormatFileSizePipe,
    MatExpansionModule,
    NgOptimizedImage,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmItemImports,
  ],
  providers: [
    provideIcons({
      lucideFilePlusCorner,
      lucideTrash,
      lucideGripVertical,
      lucideFile,
      lucideLanguages,
    }),
  ],
})
export class AssetsSelectComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(MatDialog);
  private readonly assetService = inject(AssetService);

  // Inputs
  form = input.required<FormArray>();
  component = input.required<SchemaFieldAssets>();
  space = input.required<Space>();
  // Outputs
  assetsChange = output<string[]>();

  assets = signal<AssetFile[]>([]);
  // Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    //console.group('AssetsSelectComponent:ngOnInit')
    //console.log(this.form)
    this.loadData();
    //console.groupEnd()
  }

  loadData(): void {
    const ids: string[] | undefined = this.form().controls.map(it => it.value.uri as string);
    if (ids && ids.length > 0) {
      this.assetService.findByIds(this.space().id, ids).subscribe({
        next: assets => {
          const byId = new Map<string, Asset>(assets.map(item => [item.id, item]));
          // Make sure to have assets display in exactly the same order
          this.assets.set(
            ids
              .map(it => byId.get(it))
              .filter(asset => asset?.kind === AssetKind.FILE)
              .map(it => it as AssetFile),
          );
        },
      });
    }
  }

  openImagePreview(element: AssetFile): void {
    this.dialog
      .open<ImagePreviewDialogComponent, ImagePreviewDialogModel, void>(ImagePreviewDialogComponent, {
        panelClass: 'image-preview',
        data: {
          spaceId: this.space().id,
          asset: element,
        },
      })
      .afterClosed()
      .subscribe({
        next: () => {
          console.log('close');
        },
      });
  }

  openAssetSelectDialog(): void {
    this.dialog
      .open<AssetsSelectDialogComponent, AssetsSelectDialogModel, AssetFile[] | undefined>(AssetsSelectDialogComponent, {
        panelClass: 'full-screen',
        data: {
          spaceId: this.space().id,
          multiple: true,
          fileType: this.component().fileTypes?.at(0),
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedAssets => {
          if (selectedAssets) {
            this.assets.update(current => [...current, ...selectedAssets]);
            this.form().clear();
            this.assets().forEach(it => this.form().push(this.assetToForm(it)));
            this.assetsChange.emit(this.assets().map(it => it.id));
          }
        },
      });
  }

  assetToForm(asset: Asset): FormGroup {
    return this.fb.group({
      uri: this.fb.control(asset.id),
      kind: this.fb.control(SchemaFieldKind.ASSET),
    });
  }

  deleteAsset(idx: number) {
    this.assets.update(current => current.filter((_, i) => i !== idx));
    this.form().removeAt(idx);
    this.assetsChange.emit(this.assets().map(it => it.id));
  }

  assetDropDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.form().at(event.previousIndex);
    if (tmp) {
      this.form().removeAt(event.previousIndex);
      this.form().insert(event.currentIndex, tmp);
      this.assets.update(current => {
        const arr = [...current];
        moveItemInArray(arr, event.previousIndex, event.currentIndex);
        return arr;
      });
      this.assetsChange.emit(this.assets().map(it => it.id));
    }
  }
}
