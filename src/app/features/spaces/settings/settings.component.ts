import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFingerprintPattern,
  lucideGlobe,
  lucideLayoutDashboard,
  lucideShredder,
  lucideVectorSquare,
  lucideWebhook,
} from '@ng-icons/lucide';
import { Space } from '@shared/models/space.model';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';

interface TabItem {
  icon: string;
  link: string;
  label: string;
  colorActive?: string;
  colorInactive?: string;
}

@Component({
  selector: 'll-spaces-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, HlmTabsImports, HlmIconImports],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideGlobe,
      lucideVectorSquare,
      lucideFingerprintPattern,
      lucideWebhook,
      lucideShredder,
    }),
  ],
})
export class SettingsComponent {
  private readonly router = inject(Router);

  // Input
  spaceId = input.required<string>();

  space?: Space;
  activeTab = signal('general');
  tabItems: TabItem[] = [
    { icon: 'lucideLayoutDashboard', label: 'General', link: 'general' },
    { icon: 'lucideGlobe', label: 'Locales', link: 'locales' },
    { icon: 'lucideVectorSquare', label: 'Visual Editor', link: 'visual-editor' },
    { icon: 'lucideFingerprintPattern', label: 'Access Tokens', link: 'tokens' },
    { icon: 'lucideWebhook', label: 'Webhooks', link: 'webhooks' },
    {
      icon: 'lucideShredder',
      label: 'Danger Zone',
      link: 'danger-zone',
      colorActive: 'text-destructive!',
      colorInactive: 'text-destructive/60!',
    },
  ];

  constructor() {
    const idx = this.router.url.lastIndexOf('/');
    this.activeTab.set(this.router.url.substring(idx + 1));
  }

  onTabActivated(tabLink: string) {
    this.activeTab.set(tabLink);
    this.router.navigate(['features', 'spaces', this.spaceId(), 'settings', tabLink]);
  }
}
