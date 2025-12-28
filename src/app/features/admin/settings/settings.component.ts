import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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
  imports: [MatTabsModule, RouterModule, MatIconModule],
})
export class SettingsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);

  activeTab = 'ui';
  tabItems: TabItem[] = [{ icon: 'palette', label: 'UI', link: 'ui' }];

  constructor() {
    const idx = this.router.url.lastIndexOf('/');
    this.activeTab = this.router.url.substring(idx + 1);
  }
}
