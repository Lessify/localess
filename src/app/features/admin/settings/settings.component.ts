import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { activate } from '@angular/fire/remote-config';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
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
  imports: [MatToolbarModule, MatTabsModule, RouterModule, MatIconModule],
})
export class SettingsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);

  activeTab = 'ui';
  tabItems: TabItem[] = [{ icon: 'palette', label: 'UI', link: 'ui' }];

  constructor() {
    const router = this.router;

    const idx = router.url.lastIndexOf('/');
    this.activeTab = router.url.substring(idx + 1);
  }

  protected readonly activate = activate;
}
