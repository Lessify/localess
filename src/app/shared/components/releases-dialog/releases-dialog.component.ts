import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReleasesDialogModel } from './releases-dialog.model';

@Component({
  selector: 'll-releases-dialog',
  templateUrl: './releases-dialog.component.html',
  styleUrl: './releases-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleasesDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ReleasesDialogModel) {}
}
