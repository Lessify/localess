import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { ImagePreviewDialogModel } from './image-preview-dialog.model';
import { NgOptimizedImage } from '@angular/common';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-asset-image-preview-dialog',
  standalone: true,
  templateUrl: './image-preview-dialog.component.html',
  styleUrls: ['./image-preview-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    NgOptimizedImage,
    FormatFileSizePipe,
    TimeDurationPipe,
    MatButton,
  ],
})
export class ImagePreviewDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ImagePreviewDialogModel) {}
}
