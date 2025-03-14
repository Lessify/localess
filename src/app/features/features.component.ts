import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  Optional,
  signal,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Auth, signOut } from '@angular/fire/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { Space } from '@shared/models/space.model';
import { USER_PERMISSIONS_IMPORT_EXPORT, UserPermission } from '@shared/models/user.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import browser from 'browser-detect';
import { environment } from '../../environments/environment';

interface SideMenuItem {
  icon: string;
  link: string;
  label: string;
  permission?: UserPermission | UserPermission[];
  color?: 'primary';
}

@Component({
  selector: 'll-features',
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    RouterModule,
    MatSidenavModule,
    CanUserPerformPipe,
    CommonModule,
    MatListModule,
    MatSlideToggleModule,
  ],
})
export class FeaturesComponent implements OnInit {
  // Settings
  isSettingsMenuExpended = signal(false);
  isDebug = environment.debug;

  logo = 'assets/logo.png';
  version = environment.version;
  latestRelease?: Release;

  userSideMenu: Signal<SideMenuItem[]> = computed(() => {
    const selectedSpaceId = this.spaceStore.selectedSpaceId();
    console.log('User Side Menu Computed : Selected Space Id :', selectedSpaceId);
    console.log('User Side Menu Computed : User Role :', this.userStore.role());
    console.log('User Side Menu Computed : User Permissions :', this.userStore.permissions());
    if (selectedSpaceId) {
      return [
        { link: `spaces/${selectedSpaceId}/dashboard`, label: 'Dashboard', icon: 'dashboard' },
        {
          link: `spaces/${selectedSpaceId}/translations`,
          label: 'Translations',
          icon: 'translate',
          permission: UserPermission.TRANSLATION_READ,
        },
        { link: `spaces/${selectedSpaceId}/contents`, label: 'Content', icon: 'web_stories', permission: UserPermission.CONTENT_READ },
        { link: `spaces/${selectedSpaceId}/assets`, label: 'Assets', icon: 'attachment', permission: UserPermission.ASSET_READ },
        { link: `spaces/${selectedSpaceId}/schemas`, label: 'Schemas', icon: 'schema', permission: UserPermission.SCHEMA_READ },
        { link: `spaces/${selectedSpaceId}/tasks`, label: 'Tasks', icon: 'task', permission: USER_PERMISSIONS_IMPORT_EXPORT },
        // { link: 'plugins', label: 'Plugins', icon: 'extension', permission: UserPermission.SPACE_MANAGEMENT },
        { link: `spaces/${selectedSpaceId}/open-api`, label: 'Open API', icon: 'api', permission: UserPermission.DEV_OPEN_API },
        { link: `spaces/${selectedSpaceId}/settings`, label: 'Settings', icon: 'settings', permission: UserPermission.SPACE_MANAGEMENT },
      ];
    } else {
      return [];
    }
  });

  adminSideMenu: SideMenuItem[] = [
    { link: 'admin/users', label: 'Users', icon: 'people', permission: UserPermission.USER_MANAGEMENT },
    { link: 'admin/spaces', label: 'Spaces', icon: 'space_dashboard', permission: UserPermission.SPACE_MANAGEMENT },
    { link: 'admin/settings', label: 'Settings', icon: 'settings', permission: UserPermission.SETTINGS_MANAGEMENT },
  ];

  communitySideMenu: SideMenuItem[] = [
    { link: 'https://localess.org/docs/introduction', label: 'Documentation', icon: 'help' },
    { link: 'https://github.com/Lessify/localess', label: 'Code', icon: 'code' },
    { link: 'https://github.com/Lessify/localess/issues', label: 'Feedback', icon: 'forum' },
  ];

  private destroyRef = inject(DestroyRef);
  spaceStore = inject(SpaceStore);
  userStore = inject(UserStore);
  settingsStore = inject(LocalSettingsStore);
  appSettingsStore = inject(AppSettingsStore);

  constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly reposService: ReposService,
    private readonly dialog: MatDialog,
    @Optional() private auth: Auth,
  ) {
    reposService
      .reposGetLatestRelease({ owner: 'Lessify', repo: 'localess' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          this.latestRelease = value;
        },
      });
    effect(
      () => {
        console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
        console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
        if (!this.userStore.isAuthenticated()) {
          this.router.navigate(['login']);
        }
      },
      { allowSignalWrites: true },
    );
  }

  private static isIEorEdgeOrSafari(): boolean {
    return ['ie', 'edge', 'safari'].includes(browser().name || '');
  }

  ngOnInit(): void {
    if (FeaturesComponent.isIEorEdgeOrSafari()) {
      console.log('IE, Edge or Safari detected');
    }
  }

  onSpaceSelection(space: Space): void {
    this.spaceStore.changeSpace(space);
    this.router.navigate(['features', 'spaces', space.id, 'dashboard']);
  }

  async onLogoutClick(): Promise<void> {
    return await signOut(this.auth);
  }

  onMainMenuExpendedChangeState(): void {
    this.settingsStore.setMainMenuExpended(!this.settingsStore.mainMenuExpended());
  }

  onSettingsMenuExpendedChangeState(): void {
    this.isSettingsMenuExpended.update(it => !it);
  }

  openNewTab(link: string): void {
    window.open(link);
  }

  onDebugEnabledChangeState() {
    this.settingsStore.setDebug(!this.settingsStore.debugEnabled());
  }

  switchTheme() {
    this.settingsStore.setTheme(this.settingsStore.theme() === 'dark' ? 'light' : 'dark');
  }
}
