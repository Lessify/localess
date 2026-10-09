import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleDot, lucideCircleDotDashed, lucideCircleSmall } from '@ng-icons/lucide';
import { TranslationStatus } from '@shared/models/translation.model';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-translation-status',
  templateUrl: './translation-status.component.html',
  styleUrls: ['./translation-status.component.scss'],
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
    }),
  ],
})
export class TranslationStatusComponent {
  status = input.required<TranslationStatus>();

  tooltip = computed(() => {
    const status = this.status();
    switch (status) {
      case TranslationStatus.TRANSLATED: {
        return 'Translated';
      }
      case TranslationStatus.PARTIALLY_TRANSLATED: {
        return 'Partially Translated';
      }
      case TranslationStatus.UNTRANSLATED: {
        return 'Untranslated';
      }
    }
  });

  icon = computed(() => {
    const status = this.status();
    switch (status) {
      case TranslationStatus.TRANSLATED: {
        return 'lucideCircleDot';
      }
      case TranslationStatus.PARTIALLY_TRANSLATED: {
        return 'lucideCircleDotDashed';
      }
      case TranslationStatus.UNTRANSLATED: {
        return 'lucideCircleSmall';
      }
    }
  });
}
