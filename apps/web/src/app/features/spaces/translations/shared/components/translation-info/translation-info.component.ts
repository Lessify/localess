import { ClipboardModule } from '@angular/cdk/clipboard';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { Locale, Translation } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucidePencil, lucideReplace, lucideTrash } from '@ng-icons/lucide';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { identifyTranslationStatus } from '../../models/translation.model';
import { TRANSLATION_STATUS_LABELS } from '../../models/translation-status.model';

/**
 * The details of a translation (key, status, description, labels, dates) and its actions (rename, edit, delete): the
 * info panel of the Translations page, and the same in a dialog when the page is too narrow for the panel.
 */
@Component({
  selector: 'll-translation-info',
  templateUrl: './translation-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    DatePipe,
    ClipboardModule,
    HasRolePipe,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmSeparatorImports,
    HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideCopy, lucidePencil, lucideReplace, lucideTrash })],
})
export class TranslationInfoComponent {
  private readonly notificationService = inject(NotificationService);

  readonly translation = input<Translation | undefined>(undefined);
  readonly availableLocales = input.required<Locale[]>();
  /** The labels the page filters by: shown highlighted. */
  readonly selectedLabels = input<string[]>([]);

  readonly editKey = output<Translation>();
  readonly edit = output<Translation>();
  readonly remove = output<Translation>();

  statusLabel(translation: Translation): string {
    return TRANSLATION_STATUS_LABELS[identifyTranslationStatus(translation, this.availableLocales())];
  }

  copied(): void {
    this.notificationService.success(`Translation ID copied to clipboard.`);
  }
}
