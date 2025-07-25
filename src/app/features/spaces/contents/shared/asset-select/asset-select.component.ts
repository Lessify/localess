import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatError } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetsSelectDialogComponent } from '@shared/components/assets-select-dialog/assets-select-dialog.component';
import { AssetsSelectDialogModel } from '@shared/components/assets-select-dialog/assets-select-dialog.model';
import { ImagePreviewDirective } from '@shared/directives/image-preview.directive';
import { AssetFile } from '@shared/models/asset.model';
import { SchemaFieldAsset, SchemaFieldKind } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { AssetService } from '@shared/services/asset.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogModel } from '@shared/components/image-preview-dialog/image-preview-dialog.model';

@Component({
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    CommonModule,
    ImagePreviewDirective,
    FormatFileSizePipe,
    MatError,
    MatExpansionModule,
    NgOptimizedImage,
  ],
})
export class AssetSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly assetService = inject(AssetService);

  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldAsset>();
  space = input.required<Space>();
  hover = input(false);
  asset?: AssetFile;

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
          this.asset = asset as AssetFile;
          this.cd.markForCheck();
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
            this.asset = undefined;
            this.cd.detectChanges();
            this.asset = selectedAssets[0];
            this.form().patchValue({
              uri: this.asset.id,
              kind: SchemaFieldKind.ASSET,
            });
            // this.assets.forEach(it => this.form?.push(this.assetToForm(it)))
            this.cd.markForCheck();
          }
        },
      });
  }

  deleteAsset() {
    this.asset = undefined;
    this.form().controls['uri'].setValue(null);
    //this.form?.reset();
  }
}
