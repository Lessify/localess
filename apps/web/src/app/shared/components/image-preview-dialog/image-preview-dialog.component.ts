import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { AssetFileMetadata } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucidePlay } from '@ng-icons/lucide';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { ImagePreviewDialogContext } from './image-preview-dialog.model';

@Component({
  selector: 'll-asset-image-preview-dialog',
  templateUrl: './image-preview-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, NgOptimizedImage, FormatFileSizePipe, TimeDurationPipe, HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucidePlay })],
})
export class ImagePreviewDialogComponent {
  /** The playback length of an animated image or a video (seconds); other files have none. */
  protected readonly durationOf = (metadata: AssetFileMetadata): number | undefined =>
    'duration' in metadata ? metadata.duration : undefined;

  /** Read-only preview: there is no result, so the dialog needs no `BrnDialogRef`. */
  readonly context = injectBrnDialogContext<ImagePreviewDialogContext>();

  /** A video plays in the dialog; anything else is shown as a picture. */
  protected readonly isVideo = this.context.asset.type.startsWith('video/');
  /** Play was pressed: the video is mounted, and only then fetched. */
  protected readonly playing = signal(false);
  /** The browser can't decode it (a codec it lacks): its picture is shown instead, with a download link. */
  protected readonly playbackFailed = signal(false);

  private readonly assetUrl = `/api/v1/spaces/${this.context.spaceId}/assets/${this.context.asset.id}`;
  protected readonly originalUrl = `${this.assetUrl}/original`;
  protected readonly downloadUrl = `${this.assetUrl}/download`;
  protected readonly thumbnailUrl = `/api/app/spaces/${this.context.spaceId}/assets/${this.context.asset.id}/thumbnail`;
}
