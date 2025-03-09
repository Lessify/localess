import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { PluginDefinition } from '@shared/models/plugin.model';
import { InstallDialogModel } from './install-dialog.model';

@Component({
  selector: 'll-plugin-install-dialog',
  standalone: true,
  templateUrl: './install-dialog.component.html',
  styleUrls: ['./install-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatTableModule, MatSortModule, MatButtonModule],
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
