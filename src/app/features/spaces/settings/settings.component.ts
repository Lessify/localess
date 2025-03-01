import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Space } from '@shared/models/space.model';
import { activate } from '@angular/fire/remote-config';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';

interface TabItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-spaces-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatTabsModule, MatIcon, RouterOutlet, RouterLink],
})
export class SettingsComponent {
  // Input
  spaceId = input.required<string>();

  space?: Space;
  activeTab = 'general';
  tabItems: TabItem[] = [
    { icon: 'space_dashboard', label: 'General', link: 'general' },
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
