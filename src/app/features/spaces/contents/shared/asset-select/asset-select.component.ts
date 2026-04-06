import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFile, lucideFilePlusCorner, lucideLanguages, lucideTrash } from '@ng-icons/lucide';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogModel } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { ImagePreviewDirective } from '@shared/directives/image-preview.directive';
import { AssetFile } from '@shared/models/asset.model';
import { SchemaFieldAsset, SchemaFieldKind } from '@shared/models/schema.model';
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
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    CommonModule,
    ImagePreviewDirective,
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
      lucideFile,
      lucideLanguages,
    }),
  ],
})
export class AssetSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(MatDialog);
  private readonly assetService = inject(AssetService);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldAsset>();
  space = input.required<Space>();
  hover = input(false);
  asset = signal<AssetFile | undefined>(undefined);

  //Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    if (this.form().value.kind === null) {
      this.form().patchValue({ kind: SchemaFieldKind.ASSET });
    }
    this.loadData();
  }

  loadData(): void {
    const id: string | undefined = this.form().value.uri;
    if (id) {
      this.assetService.findById(this.space().id, id).subscribe({
        next: asset => {
          this.asset.set(asset as AssetFile);
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
          multiple: false,
          fileType: this.component().fileTypes?.at(0),
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedAssets => {
          if (selectedAssets && selectedAssets.length > 0) {
            this.asset.set(selectedAssets[0]);
            this.form().patchValue({
              uri: selectedAssets[0].id,
              kind: SchemaFieldKind.ASSET,
            });
          }
        },
      });
  }

  deleteAsset() {
    this.asset.set(undefined);
    this.form().controls['uri'].setValue(null);
    //this.form?.reset();
  }
}
