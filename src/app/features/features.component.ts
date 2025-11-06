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
  signal,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Auth, signOut } from '@angular/fire/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { IconType, NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucideChevronDown,
  lucideChevronsUpDown,
  lucideFileCheck,
  lucideGalleryHorizontal,
  lucideGauge,
  lucideImage,
  lucideLanguages,
  lucideLogOut,
  lucideSend,
  lucideSettings,
  lucideShieldAlert,
  lucideShieldCheck,
  lucideToyBrick,
  lucideUserCircle,
  lucideUsers,
} from '@ng-icons/lucide';
import { tablerApi, tablerSpaces } from '@ng-icons/tabler-icons';
import { LogoComponent } from '@shared/components/logo';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { Space } from '@shared/models/space.model';
import { USER_PERMISSIONS_IMPORT_EXPORT, UserPermission } from '@shared/models/user.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import { BrnMenuImports } from '@spartan-ng/brain/menu';
import { BrnTooltipImports } from '@spartan-ng/brain/tooltip';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmMenuImports } from '@spartan-ng/helm/menu';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmTypographyImports } from '@spartan-ng/helm/typography';
import browser from 'browser-detect';
import { cva } from 'class-variance-authority';
import { environment } from '../../environments/environment';

const appTextVariants = cva(
  'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xl font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] ',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent',
        destructive:
          'bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 border-transparent text-white',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

interface SideMenuItem {
  icon: IconType;
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
    MatDividerModule,
    HlmSidebarImports,
    NgIcon,
    HlmIcon,
    HlmTooltipImports,
    LogoComponent,
    BrnMenuImports,
    HlmMenuImports,
    HlmAvatarImports,
    BrnTooltipImports,
    HlmTypographyImports,
  ],
  providers: [
    provideIcons({
      lucideGauge,
      lucideLanguages,
      lucideGalleryHorizontal,
      lucideImage,
      lucideToyBrick,
      lucideFileCheck,
      tablerApi,
      lucideSettings,
      lucideUsers,
      tablerSpaces,
      lucideChevronsUpDown,
      lucideChevronDown,
      lucideLogOut,
      lucideUserCircle,
      lucideShieldAlert,
      lucideShieldCheck,
      lucideBookOpen,
      lucideSend,
    }),
  ],
})
export class FeaturesComponent implements OnInit {
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly reposService = inject(ReposService);
  private readonly dialog = inject(MatDialog);
  private auth = inject(Auth);

  public readonly sidebarService = inject(HlmSidebarService);

  // Settings
  isSettingsMenuExpended = signal(false);
  isDebug = environment.debug;

  version = environment.version;
  latestRelease?: Release;

  appTextClass = computed(() => appTextVariants({ variant: this.appSettingsStore.ui()?.color }));

  userSideMenu: Signal<SideMenuItem[]> = computed(() => {
    const selectedSpaceId = this.spaceStore.selectedSpaceId();
    console.log('User Side Menu Computed : Selected Space Id :', selectedSpaceId);
    console.log('User Side Menu Computed : User Role :', this.userStore.role());
    console.log('User Side Menu Computed : User Permissions :', this.userStore.permissions());
    if (selectedSpaceId) {
      return [
        { link: `spaces/${selectedSpaceId}/dashboard`, label: 'Dashboard', icon: 'lucideGauge' },
        {
          link: `spaces/${selectedSpaceId}/translations`,
          label: 'Translations',
          icon: 'lucideLanguages',
          permission: UserPermission.TRANSLATION_READ,
        },
        {
          link: `spaces/${selectedSpaceId}/contents`,
          label: 'Content',
          icon: 'lucideGalleryHorizontal',
          permission: UserPermission.CONTENT_READ,
        },
        { link: `spaces/${selectedSpaceId}/assets`, label: 'Assets', icon: 'lucideImage', permission: UserPermission.ASSET_READ },
        { link: `spaces/${selectedSpaceId}/schemas`, label: 'Schemas', icon: 'lucideToyBrick', permission: UserPermission.SCHEMA_READ },
        { link: `spaces/${selectedSpaceId}/tasks`, label: 'Tasks', icon: 'lucideFileCheck', permission: USER_PERMISSIONS_IMPORT_EXPORT },
        { link: `spaces/${selectedSpaceId}/open-api`, label: 'Open API', icon: 'tablerApi', permission: UserPermission.DEV_OPEN_API },
        {
          link: `spaces/${selectedSpaceId}/settings`,
          label: 'Settings',
          icon: 'lucideSettings',
          permission: UserPermission.SPACE_MANAGEMENT,
        },
      ];
    } else {
      return [];
    }
  });

  adminSideMenu: SideMenuItem[] = [
    { link: 'admin/users', label: 'Users', icon: 'lucideUsers', permission: UserPermission.USER_MANAGEMENT },
    { link: 'admin/spaces', label: 'Spaces', icon: 'tablerSpaces', permission: UserPermission.SPACE_MANAGEMENT },
    { link: 'admin/settings', label: 'Settings', icon: 'lucideSettings', permission: UserPermission.SETTINGS_MANAGEMENT },
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

  constructor() {
    const reposService = this.reposService;

    reposService
      .reposGetLatestRelease({ owner: 'Lessify', repo: 'localess' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          this.latestRelease = value;
        },
      });
    effect(async () => {
      console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
      console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
      if (!this.userStore.isAuthenticated()) {
        await this.router.navigate(['login']);
      }
    });
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
