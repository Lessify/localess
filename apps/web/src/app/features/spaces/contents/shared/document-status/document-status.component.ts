import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleArrowUp, lucideCircleDotDashed, lucideCircleFadingArrowUp } from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** ISO timestamp (from the API) or epoch seconds → milliseconds, for comparing. */
function toMillis(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? value * 1000 : Date.parse(value);
}

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
      lucideCircleDotDashed,
      lucideCircleArrowUp,
      lucideCircleFadingArrowUp,
    }),
  ],
})
export class DocumentStatusComponent {
  updatedAt = input.required<string | number>();
  publishedAt = input<string | number | null>();

  private readonly updatedAtMs = computed(() => toMillis(this.updatedAt()) ?? 0);
  private readonly publishedAtMs = computed(() => toMillis(this.publishedAt()));

  tooltip = computed(() => {
    const updatedAt = this.updatedAtMs();
    const publishedAt = this.publishedAtMs();
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
    const updatedAt = this.updatedAtMs();
    const publishedAt = this.publishedAtMs();
    if (publishedAt) {
      if (publishedAt > updatedAt) {
        return 'lucideCircleArrowUp';
      } else if (publishedAt < updatedAt) {
        return 'lucideCircleFadingArrowUp';
      }
    }
    return 'lucideCircleDotDashed';
  });
}
