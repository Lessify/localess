import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Space } from '@shared/models/space.model';
import { activate } from '@angular/fire/remote-config';

interface TabItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  // Input
  spaceId = input.required<string>();

  space?: Space;
  activeTab = 'general';
  tabItems: TabItem[] = [
    { icon: 'space_dashboard', label: 'General', link: 'general' },
    { icon: 'palette', label: 'UI', link: 'ui' },
    { icon: 'language', label: 'Locales', link: 'locales' },
    { icon: 'shape_line', label: 'Visual Editor', link: 'visual-editor' },
    { icon: 'badge', label: 'Access Tokens', link: 'tokens' },
  ];

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
