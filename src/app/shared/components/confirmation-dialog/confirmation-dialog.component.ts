import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { ConfirmationDialogModel } from './confirmation-dialog.model';

@Component({
  selector: 'll-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, HlmButtonImports],
})
export class ConfirmationDialogComponent {
  data = inject<ConfirmationDialogModel>(MAT_DIALOG_DATA);
}
