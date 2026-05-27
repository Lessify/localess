import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { ImagePreviewDialogModel } from './image-preview-dialog.model';

@Component({
  selector: 'll-asset-image-preview-dialog',
  templateUrl: './image-preview-dialog.component.html',
  styleUrls: ['./image-preview-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, NgOptimizedImage, FormatFileSizePipe, TimeDurationPipe, HlmButtonImports],
})
export class ImagePreviewDialogComponent {
  data = inject<ImagePreviewDialogModel>(MAT_DIALOG_DATA);
}
