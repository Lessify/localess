import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideLayoutDashboard } from '@ng-icons/lucide';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmIconImports } from '@spartan-ng/helm/icon';

interface TabItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-admin-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, HlmTabsImports, HlmIconImports],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
    }),
  ],
})
export class SettingsComponent {
  private readonly router = inject(Router);

  activeTab = signal('ui');
  tabItems: TabItem[] = [{ icon: 'lucideLayoutDashboard', label: 'UI', link: 'ui' }];

  constructor() {
    const idx = this.router.url.lastIndexOf('/');
    this.activeTab.set(this.router.url.substring(idx + 1));
  }

  onTabActivated(tabLink: string) {
    this.activeTab.set(tabLink);
    this.router.navigate(['features', 'admin', 'settings', tabLink]);
  }
}
