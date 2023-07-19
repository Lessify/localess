import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchemaFieldAssets, SchemaFieldKind} from '@shared/models/schema.model';
import {MatDialog} from '@angular/material/dialog';
import {NotificationService} from '@shared/services/notification.service';
import {Asset} from '@shared/models/asset.model';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {AssetService} from '@shared/services/asset.service';
import {Space} from '@shared/models/space.model';
import {environment} from '../../../../../environments/environment';
import {AssetsSelectDialogComponent} from '@shared/components/assets-select-dialog/assets-select-dialog.component';
import {AssetsSelectDialogModel} from '@shared/components/assets-select-dialog/assets-select-dialog.model';

@Component({
  selector: 'll-assets-select',
  templateUrl: './assets-select.component.html',
  styleUrls: ['./assets-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetsSelectComponent implements OnInit, OnDestroy {
  isDebug = environment.debug
  @Input() form?: FormArray;
  // @Input() ids?: string[];
  @Input() component?: SchemaFieldAssets;
  @Input() space?: Space;


  @Output() assetsChange = new EventEmitter<string[]>();

  assets: Asset[] = []

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
    this.loadData()
  }

  loadData(): void {
    const ids: string[] | undefined = this.form?.controls.map(it => it.value.uri as string)
    if (ids && ids.length > 0) {
      this.assetService.findByIds(this.space?.id!!, ids)
        .subscribe({
          next: (assets) => {
            this.assets = assets
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
          multiple: true,
          fileType: this.component?.fileTypes?.at(0)
        }
      })
      .afterClosed()
      .subscribe({
        next: (selectedAssets) => {
          if (selectedAssets) {
            this.assets.push(...selectedAssets)
            this.form?.clear()
            this.assets.forEach(it => this.form?.push(this.assetToForm(it)))
            this.assetsChange.next(this.assets.map(it => it.id))
            //this.form?.root.updateValueAndValidity()
            //this.cd.markForCheck();
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

  ngOnDestroy(): void {
    this.assetsChange.complete()
    //console.log("AssetsSelectComponent:ngOnDestroy")
  }

  deleteAsset(idx: number) {
    this.assets.splice(idx, 1)
    this.form?.removeAt(idx)
    this.assetsChange.next(this.assets.map(it => it.id))
    //this.form?.root.updateValueAndValidity()
  }
}
