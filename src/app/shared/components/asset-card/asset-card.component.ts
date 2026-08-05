import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
import { Asset, fileIcon, filePreview } from '@shared/models/asset.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-asset-card',
  templateUrl: './asset-card.component.html',
  styleUrls: ['./asset-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NgOptimizedImage,
    TimeDurationPipe,
    FormatFileSizePipe,
    HlmCardImports,
    HlmBadgeImports,
    HlmIconImports,
    HlmSpinnerImports,
    HlmTooltipImports,
  ],
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
  // Inputs
  readonly item = input.required<Asset>();
  readonly spaceId = input.required<string>();
  readonly zoomCursor = input(false);
  readonly showFooter = input(true);

  // Outputs
  readonly assetSelect = output<Asset>();

  readonly fileIcon = fileIcon;
  readonly filePreview = filePreview;
}
