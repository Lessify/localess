import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

import { ImagePreviewDialogContext } from './image-preview-dialog.model';

@Component({
  selector: 'll-asset-image-preview-dialog',
  templateUrl: './image-preview-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, NgOptimizedImage, FormatFileSizePipe, TimeDurationPipe, HlmButtonImports],
})
export class ImagePreviewDialogComponent {
  /** Read-only preview: there is no result, so the dialog needs no `BrnDialogRef`. */
  readonly context = injectBrnDialogContext<ImagePreviewDialogContext>();
}
