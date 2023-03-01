import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchematicComponent, SchematicComponentKind} from '@shared/models/schematic.model';
import {environment} from '../../../../environments/environment';
import {MatDialog} from '@angular/material/dialog';
import {AssetSelectDialogModel} from '../asset-select-dialog/asset-select-dialog.model';
import {AssetSelectDialogComponent} from '../asset-select-dialog/asset-select-dialog.component';
import {NotificationService} from '@shared/services/notification.service';

@Component({
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetSelectComponent implements OnInit {
  isTest = environment.test
  @Input() form?: FormGroup;
  @Input() component?: SchematicComponent;

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly dialog: MatDialog,
    private readonly notificationService: NotificationService,
  ) {
  }

  ngOnInit(): void {
    // Data init in case everything is null
    if (this.form?.value.kind === null || this.form?.value.type === null) {
      this.form.patchValue({kind: SchematicComponentKind.LINK, type: 'url'})
    }

  }

  openAssetSelectDialog(): void {
    this.dialog.open<AssetSelectDialogComponent, AssetSelectDialogModel, any>(
      AssetSelectDialogComponent, {
        minWidth: "900px",
        width: "calc(100vw - 160px)",
        maxWidth: "1280px",
        maxHeight: "calc(100vh - 80px)",
        data: {
          multiple: true
        }
      })
      .afterClosed()
      .subscribe({
        next: () => {
        },
        error: () => {
        }
      });
  }

}
