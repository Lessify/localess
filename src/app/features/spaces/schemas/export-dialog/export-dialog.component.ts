import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucideCloudDownload })],
})
export class ExportDialogComponent {}
