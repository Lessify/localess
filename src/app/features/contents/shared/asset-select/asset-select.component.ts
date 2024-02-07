import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaFieldAsset, SchemaFieldKind } from '@shared/models/schema.model';
import { MatDialog } from '@angular/material/dialog';
import { Asset } from '@shared/models/asset.model';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { AssetService } from '@shared/services/asset.service';
import { Space } from '@shared/models/space.model';
import { AssetsSelectDialogComponent } from '@shared/components/assets-select-dialog/assets-select-dialog.component';
import { AssetsSelectDialogModel } from '@shared/components/assets-select-dialog/assets-select-dialog.model';
import { selectSettings } from '@core/state/settings/settings.selectors';

@Component({
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetSelectComponent implements OnInit {
  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldAsset>();
  space = input.required<Space>();
  asset?: Asset;

  //Subscriptions
  settings$ = this.store.select(selectSettings);

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly store: Store<AppState>,
    private readonly assetService: AssetService
  ) {}

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
          this.asset = asset;
          this.cd.markForCheck();
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
