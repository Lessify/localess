import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { InstallDialogModel } from './install-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { MatTableDataSource } from '@angular/material/table';
import { PluginDefinition } from '@shared/models/plugin.model';

@Component({
  selector: 'll-plugin-install-dialog',
  templateUrl: './install-dialog.component.html',
  styleUrls: ['./install-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallDialogComponent {
  dataSource: MatTableDataSource<PluginDefinition> = new MatTableDataSource<PluginDefinition>(this.data.plugins);
  displayedColumns: string[] = ['name', 'owner', 'version', 'actions'];

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: InstallDialogModel,
  ) {}
}
