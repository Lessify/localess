import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { RandomBackgroundComponent } from '@shared/components/background/random';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { FeatureCarouselComponent } from './shared/feature-carousel/feature-carousel.component';

@Component({
  selector: 'll-auth',
  templateUrl: './auth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideMoon, lucideSun })],
  imports: [
    NgOptimizedImage,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    RandomBackgroundComponent,
    RouterModule,
    FeatureCarouselComponent,
  ],
})
export class AuthComponent {
  readonly settingsStore = inject(LocalSettingsStore);

  switchTheme(): void {
    this.settingsStore.setTheme(this.settingsStore.theme() === 'dark' ? 'light' : 'dark');
  }
}
