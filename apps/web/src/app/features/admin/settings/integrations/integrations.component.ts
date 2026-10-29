import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import { type IntegrationCategory, INTEGRATIONS, type TranslatePrimary } from '@localess/shared';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { IntegrationService } from './integration.service';
import { IntegrationCardComponent } from './integration-card/integration-card.component';

const CATEGORY_TITLES: Record<IntegrationCategory, string> = { translation: 'Machine translation', assets: 'Assets' };

/** Admin → Settings → Integrations: one card per integration, grouped by category, and the primary translation provider. */
@Component({
  selector: 'll-integrations',
  templateUrl: './integrations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IntegrationCardComponent, HlmBadgeImports, HlmButtonImports],
})
export class IntegrationsComponent {
  private readonly integrationService = inject(IntegrationService);
  private readonly notificationService = inject(NotificationService);

  readonly list = toSignal(this.integrationService.findAll());

  /** The categories in definition order, each with its definitions and their current state. */
  readonly groups = computed(() => {
    const list = this.list();
    if (!list) return [];
    const categories = [...new Set(INTEGRATIONS.map(it => it.category))];
    return categories.map(category => ({
      category,
      title: CATEGORY_TITLES[category],
      cards: INTEGRATIONS.filter(it => it.category === category).flatMap(definition => {
        const integration = list.integrations.find(it => it.id === definition.id);
        return integration ? [{ definition, integration }] : [];
      }),
    }));
  });

  /** The primary choice matters only when both translation providers are on. */
  readonly showPrimary = computed(() => {
    const on = (id: string) => this.list()?.integrations.some(it => it.id === id && it.enabled && it.status !== 'unreadable');
    return on('deepl') && on('google-translate');
  });
  readonly primary = computed(() => this.list()?.translatePrimary);
  readonly primaryOptions: { value: TranslatePrimary; label: string }[] = [
    { value: 'deepl', label: 'DeepL' },
    { value: 'google-translate', label: 'Google' },
  ];

  setPrimary(value: TranslatePrimary): void {
    this.integrationService.setTranslatePrimary(value).subscribe({
      error: () => this.notificationService.error('The primary provider could not be changed.'),
    });
  }
}
