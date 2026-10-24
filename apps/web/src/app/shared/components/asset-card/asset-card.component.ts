import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Asset, type AssetFileMetadata } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFile,
  lucideFileDigit,
  lucideFileImage,
  lucideFileMusic,
  lucideFileText,
  lucideFileVideoCamera,
  lucideFolder,
} from '@ng-icons/lucide';
import { fileIcon, filePreview } from '@shared/models/asset.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-asset-card',
  templateUrl: './asset-card.component.html',
  styleUrls: ['./asset-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TimeDurationPipe, FormatFileSizePipe, HlmCardImports, HlmBadgeImports, HlmIconImports, HlmTooltipImports],
  providers: [
    provideIcons({
      lucideFile,
      lucideFileImage,
      lucideFileVideoCamera,
      lucideFileMusic,
      lucideFileText,
      lucideFileDigit,
      lucideFolder,
    }),
  ],
})
export class AssetCardComponent {
  /** The playback length of an animated image or a video (seconds); other files have none. */
  protected readonly durationOf = (metadata: AssetFileMetadata): number | undefined =>
    'duration' in metadata ? metadata.duration : undefined;

  // Inputs
  readonly item = input.required<Asset>();
  readonly spaceId = input.required<string>();
  readonly zoomCursor = input(false);
  readonly showFooter = input(true);
  /** Where the asset is ('~/Images/Photos'), shown under its name: lists from several folders set it. */
  readonly path = input<string>();

  // Outputs
  readonly assetSelect = output<Asset>();

  readonly fileIcon = fileIcon;
  readonly filePreview = filePreview;
}
