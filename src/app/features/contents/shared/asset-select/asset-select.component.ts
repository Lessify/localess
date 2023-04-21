import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchemaField, SchemaFieldKind} from '@shared/models/schema.model';
import {environment} from '../../../../../environments/environment';
import {MatDialog} from '@angular/material/dialog';
import {NotificationService} from '@shared/services/notification.service';
import {Asset} from '@shared/models/asset.model';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {AssetService} from '@shared/services/asset.service';
import {Space} from '@shared/models/space.model';
import {AssetsSelectDialogComponent} from '../assets-select-dialog/assets-select-dialog.component';
import {AssetsSelectDialogModel} from '../assets-select-dialog/assets-select-dialog.model';

@Component({
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetSelectComponent implements OnInit {
  isDebug = environment.debug
  @Input() form?: FormGroup;
  @Input() component?: SchemaField;
  @Input() space?: Space;
  asset?: Asset;

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly assetService: AssetService,
  ) {
  }

  ngOnInit(): void {
    if (this.form?.value.kind === null) {
      this.form.patchValue({kind: SchemaFieldKind.ASSET})
    }
    this.loadData()
  }

  loadData(): void {
    const id: string | undefined = this.form?.value.uri
    if (id) {
      this.assetService.findById(this.space?.id!!, id)
        .subscribe({
          next: (asset) => {
            this.asset = asset
            this.cd.markForCheck()
          }
        })
    }
  }

  openAssetSelectDialog(): void {
    this.dialog.open<AssetsSelectDialogComponent, AssetsSelectDialogModel, Asset[] | undefined>(
      AssetsSelectDialogComponent, {
        minWidth: "900px",
        width: "calc(100vw - 160px)",
        maxWidth: "1280px",
        maxHeight: "calc(100vh - 80px)",
        data: {
          spaceId: this.space?.id!!,
          multiple: false
        }
      })
      .afterClosed()
      .subscribe({
        next: (selectedAssets) => {
          this.asset = undefined
          this.cd.detectChanges();
          if (selectedAssets && selectedAssets.length > 0) {
            this.asset = selectedAssets[0]
            this.form?.patchValue({
              uri: this.asset.id,
              kind: SchemaFieldKind.ASSET
            })
            // this.assets.forEach(it => this.form?.push(this.assetToForm(it)))
            this.cd.markForCheck();
          }
        }
      });
  }

  assetToForm(asset: Asset): FormGroup {
    return this.fb.group({
      uri: this.fb.control(asset.id),
      kind: this.fb.control(SchemaFieldKind.ASSET),
    })
  }

  deleteAsset() {
    this.asset = undefined;
    this.form?.controls['uri'].setValue(null);
    //this.form?.reset();
  }
}
