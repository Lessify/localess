import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { ExportDialogResult } from './export-dialog.model';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucideCloudDownload })],
})
export class ExportDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<ExportDialogResult>>(BrnDialogRef);

  save(): void {
    this.dialogRef.close({});
  }
}
