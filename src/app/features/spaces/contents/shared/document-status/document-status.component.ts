import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { lucideCircleDot, lucideCircleDotDashed, lucideCircleSmall, lucideDot } from '@ng-icons/lucide';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-document-status',
  templateUrl: './document-status.component.html',
  styleUrls: ['./document-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center',
  },
  imports: [HlmIconImports, HlmTooltipImports],
  providers: [
    provideIcons({
      lucideCircleDot,
      lucideCircleDotDashed,
      lucideCircleSmall,
      lucideDot,
    }),
  ],
})
export class DocumentStatusComponent {
  updatedAt = input.required<number>();
  publishedAt = input<number>();

  tooltip = computed(() => {
    const updatedAt = this.updatedAt();
    const publishedAt = this.publishedAt();
    if (publishedAt) {
      if (publishedAt > updatedAt) {
        return 'Published';
      } else if (publishedAt < updatedAt) {
        return 'Draft';
      }
    }
    return 'Not published';
  });

  icon = computed(() => {
    const updatedAt = this.updatedAt();
    const publishedAt = this.publishedAt();
    if (publishedAt) {
      if (publishedAt > updatedAt) {
        return 'lucideCircleDot';
      } else if (publishedAt < updatedAt) {
        return 'lucideCircleDotDashed';
      }
    }
    return 'lucideDot';
  });
}
