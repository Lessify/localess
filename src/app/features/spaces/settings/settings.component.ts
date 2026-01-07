import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterModule } from '@angular/router';
import { Space } from '@shared/models/space.model';

interface TabItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-spaces-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, MatIconModule, RouterModule],
})
export class SettingsComponent {
  private readonly router = inject(Router);

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

  constructor() {
    const router = this.router;

    const idx = router.url.lastIndexOf('/');
    this.activeTab = router.url.substring(idx + 1);
  }
}
