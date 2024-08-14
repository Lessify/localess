import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { activate } from '@angular/fire/remote-config';

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
})
export class SettingsComponent {
  activeTab = 'ui';
  tabItems: TabItem[] = [{ icon: 'palette', label: 'UI', link: 'ui' }];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cd: ChangeDetectorRef,
  ) {
    const idx = router.url.lastIndexOf('/');
    this.activeTab = router.url.substring(idx + 1);
  }

  protected readonly activate = activate;
}
