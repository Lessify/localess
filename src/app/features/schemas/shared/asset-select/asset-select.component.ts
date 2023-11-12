import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@shared/services/notification.service';
import { Asset, AssetFile, AssetKind } from '@shared/models/asset.model';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { AssetService } from '@shared/services/asset.service';
import { Space } from '@shared/models/space.model';
import { AssetsSelectDialogComponent } from '@shared/components/assets-select-dialog/assets-select-dialog.component';
import { AssetsSelectDialogModel } from '@shared/components/assets-select-dialog/assets-select-dialog.model';
import { AssetFileType } from '@shared/models/schema.model';

@Component({
  selector: 'll-schema-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrl: './asset-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetSelectComponent implements OnInit {
  @Input({ required: true }) space?: Space;
  @Input() assetId?: string;
  @Output() assetChange = new EventEmitter<string | undefined>();
  asset?: AssetFile;

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly assetService: AssetService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    if (this.assetId) {
      this.assetService.findById(this.space!.id, this.assetId).subscribe({
        next: asset => {
          if (asset.kind === AssetKind.FILE) {
            this.asset = asset;
            this.cd.markForCheck();
          }
        },
      });
    }
  }

  openAssetSelectDialog(): void {
    this.dialog
      .open<AssetsSelectDialogComponent, AssetsSelectDialogModel, Asset[] | undefined>(AssetsSelectDialogComponent, {
        minWidth: '900px',
        width: 'calc(100vw - 160px)',
        maxWidth: '1280px',
        maxHeight: 'calc(100vh - 80px)',
        data: {
          spaceId: this.space!.id,
          multiple: false,
          fileType: AssetFileType.IMAGE,
        },
      })
      .afterClosed()
      .subscribe({
        next: selectedAssets => {
          if (selectedAssets && selectedAssets.length > 0) {
            const [selectedAsset] = selectedAssets;
            this.asset = undefined;
            this.cd.detectChanges();
            if (selectedAsset.kind === AssetKind.FILE) {
              this.asset = selectedAsset;
              this.assetChange.emit(this.asset.id);
            }
            this.cd.markForCheck();
          }
        },
      });
  }

  deleteAsset() {
    this.asset = undefined;
    this.assetChange.emit(undefined);
  }
}
