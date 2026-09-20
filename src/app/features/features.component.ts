import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, signOut } from '@angular/fire/auth';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { IconType, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeInfo,
  lucideBookOpen,
  lucideChevronDown,
  lucideChevronRight,
  lucideChevronsUpDown,
  lucideCircleQuestionMark,
  lucideCode,
  lucideCode2,
  lucideDot,
  lucideEarth,
  lucideExternalLink,
  lucideFileCheck,
  lucideGalleryHorizontal,
  lucideGauge,
  lucideHeartHandshake,
  lucideImage,
  lucideLanguages,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMoon,
  lucidePlus,
  lucideSend,
  lucideSettings,
  lucideShieldAlert,
  lucideShieldCheck,
  lucideSparkles,
  lucideSun,
  lucideToyBrick,
  lucideUserCircle,
  lucideUsers,
  lucideWebhook,
} from '@ng-icons/lucide';
import { tablerApi, tablerSpaces } from '@ng-icons/tabler-icons';
import { LogoComponent } from '@shared/components/logo';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { Space } from '@shared/models/space.model';
import { USER_PERMISSIONS_IMPORT_EXPORT, UserPermission } from '@shared/models/user.model';
import { Version } from '@shared/models/version.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { VersionService } from '@shared/services/version.service';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmHoverCardImports } from '@spartan-ng/helm/hover-card';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { cva } from 'class-variance-authority';
import { filter, mergeMap, timer } from 'rxjs';

import { environment } from '../../environments/environment';
import { WHATS_NEW } from './whats-new/whats-new.data';
import { isVersionAtLeast, isVersionNewer, WHATS_NEW_DIALOG_CONTENT_CLASS } from './whats-new/whats-new.model';
import { WhatsNewDialogComponent } from './whats-new/whats-new-dialog.component';

/**
 * The oldest release this build recognises. 4.0.0 is where support starts and where the tags dropped
 * their `v`, so a tag is taken as a version verbatim and anything below the floor is ignored outright
 * rather than parsed - GitHub's newest release can sit in the 3.x range for as long as it likes.
 */
const MIN_SUPPORTED_VERSION = '4.0.0';

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
  items?: SideMenuItem[];
  isOpen?: WritableSignal<boolean>;
}

@Component({
  selector: 'll-features',
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    CanUserPerformPipe,
    CommonModule,
    LogoComponent,
    HlmSidebarImports,
    HlmIconImports,
    HlmHoverCardImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmAvatarImports,
    HlmButtonImports,
    HlmSeparatorImports,
    HlmBreadcrumbImports,
    HlmSheetImports,
    HlmFieldImports,
    HlmSwitchImports,
    ReactiveFormsModule,
    HlmCollapsibleImports,
  ],
  providers: [
    provideIcons({
      lucideGauge,
      lucideLanguages,
      lucideGalleryHorizontal,
      lucideImage,
      lucideToyBrick,
      lucideFileCheck,
      lucideCode2,
      lucideWebhook,
      lucideChevronRight,
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
      lucideCircleQuestionMark,
      lucideHeartHandshake,
      lucideEarth,
      lucideLifeBuoy,
      lucideExternalLink,
      lucidePlus,
      lucideMoon,
      lucideSun,
      lucideCode,
      lucideBadgeInfo,
      lucideDot,
      lucideSparkles,
    }),
  ],
})
export class FeaturesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly reposService = inject(ReposService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private readonly contentService = inject(ContentService);
  private readonly schemaService = inject(SchemaService);
  private readonly versionService = inject(VersionService);
  private readonly notificationService = inject(NotificationService);
  private readonly hlmDialog = inject(HlmDialogService);
  public readonly sidebarService = inject(HlmSidebarService);
  public readonly spaceStore = inject(SpaceStore);
  public readonly userStore = inject(UserStore);
  public readonly localeSettingsStore = inject(LocalSettingsStore);
  public readonly appSettingsStore = inject(AppSettingsStore);

  // Settings
  isDebug = environment.debug;
  showDebugSettings = signal(false);

  version = environment.version;
  /** Undefined until GitHub answers, and stays that way if it never does - the row still renders. */
  latestRelease = signal<Release | undefined>(undefined);
  currentVersion = signal<Version | undefined>(undefined);

  /** Whether GitHub has published a release newer than this build. */
  hasNewVersion = computed(() => {
    const tag = this.latestRelease()?.tag_name;
    return tag ? isVersionNewer(tag, this.version) : false;
  });

  appTextClass = computed(() => appTextVariants({ variant: this.appSettingsStore.ui()?.color }));

  /**
   * How far this install has drifted, in whole days between its build and the newest release.
   * Deployments are automated, so the build date tracks the release the install is running.
   *
   * Zero means "nothing to report": no update, no build date yet, or an unparsable date. The
   * template keys off `> 0`, so an unknown gap prints nothing rather than a misleading number.
   */
  daysBehind = computed(() => {
    const publishedAt = this.latestRelease()?.published_at;
    const buildDate = this.currentVersion()?.buildDate;
    if (!publishedAt || !buildDate || !this.hasNewVersion()) return 0;
    const days = Math.floor((Date.parse(publishedAt) - Date.parse(buildDate)) / 86_400_000);
    return days > 0 ? days : 0;
  });

  versionTooltip = computed(() => {
    const release = this.latestRelease();
    if (!release || !this.hasNewVersion()) return `You are on the latest version.`;
    const buildDate = this.currentVersion()?.buildDate;
    const built = buildDate ? ` This build is from ${new Date(buildDate).toLocaleDateString()}.` : '';
    const behind = this.daysBehind();
    const gap = behind > 0 ? ` It was released ${behind} ${behind === 1 ? 'day' : 'days'} after your build.` : '';
    return `Version ${release.tag_name} is available. Open the release notes on GitHub.${gap}${built}`;
  });

  /**
   * Whether this build ships release notes the user has not opened yet. Keyed on the notes that
   * shipped rather than on the deployed build, so a patch release with nothing to say stays quiet.
   */
  hasUnseenWhatsNew = computed(() => isVersionNewer(WHATS_NEW[0].version, this.localeSettingsStore.lastSeenWhatsNewVersion()));

  userSideMenu: Signal<SideMenuItem[]> = computed(() => {
    const selectedSpaceId = this.spaceStore.selectedSpaceId();
    const lastSuccessfulNavigation = this.router.lastSuccessfulNavigation();
    const url = lastSuccessfulNavigation?.finalUrl?.toString() ?? this.router.url;
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
        {
          link: '',
          label: 'Developers',
          icon: 'lucideCode2',
          permission: [UserPermission.DEV_OPEN_API, UserPermission.DEV_WEBHOOK],
          isOpen: signal(url.includes(`/spaces/${selectedSpaceId}/developers/`)),
          items: [
            {
              link: `spaces/${selectedSpaceId}/developers/webhooks`,
              label: 'Webhooks',
              icon: 'lucideWebhook',
              permission: UserPermission.DEV_WEBHOOK,
            },
            {
              link: `spaces/${selectedSpaceId}/developers/open-api`,
              label: 'Open API',
              icon: 'tablerApi',
              permission: UserPermission.DEV_OPEN_API,
            },
          ],
        },
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
    { link: 'https://localess.org', label: 'Visit Localess.ORG', icon: 'lucideEarth' },
    { link: 'https://localess.org/docs', label: 'Documentation', icon: 'lucideBookOpen' },
    { link: 'https://github.com/Lessify/localess', label: 'Code', icon: 'lucideCode' },
    { link: 'https://github.com/Lessify/localess/issues', label: 'Feedback', icon: 'lucideSend' },
  ];

  private destroyRef = inject(DestroyRef);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  constructor() {
    const reposService = this.reposService;

    reposService
      .reposGetLatestRelease({ owner: 'Lessify', repo: 'localess' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          // A 3.x release is history, not an upgrade this build offers, so it is dropped here rather
          // than guarded against in every computed downstream.
          if (isVersionAtLeast(value.tag_name, MIN_SUPPORTED_VERSION)) {
            this.latestRelease.set(value);
          }
        },
      });
    effect(async () => {
      console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
      console.log('User Authenticated Effect :', this.userStore.isAuthenticated());
      if (!this.userStore.isAuthenticated()) {
        await this.router.navigate(['auth', 'login']);
      }
    });

    effect(() => {
      const selectedSpaceId = this.spaceStore.selectedSpaceId();
      if (selectedSpaceId) {
        this.subscribeToDocuments(selectedSpaceId);
        this.subscribeToSchemas(selectedSpaceId);
      }
    });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const breadcrumbs = this.buildBreadcrumbs(this.route.root);
        this.breadcrumbs.set(breadcrumbs);
        // Auto-open sub-menus when navigating to a sub-route
        for (const item of this.userSideMenu()) {
          if (item.isOpen && item.items) {
            const isActive = item.items.some(sub => this.router.url.includes(sub.link));
            if (isActive) item.isOpen.set(true);
          }
        }
      });
  }

  private subscribeToDocuments(spaceId: string, attempt = 0): void {
    this.contentService
      .findAllDocuments(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: documents => this.spaceStore.updateDocuments(documents),
        error: err => {
          console.error('findAllDocuments listener failed', err);
          this.notificationService.error('Lost connection to content updates. Retrying…');
          const delay = Math.min(30000, 1000 * 2 ** attempt);
          setTimeout(() => this.subscribeToDocuments(spaceId, attempt + 1), delay);
        },
      });
  }

  private subscribeToSchemas(spaceId: string, attempt = 0): void {
    this.schemaService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => this.spaceStore.updateSchemas(schemas),
        error: err => {
          console.error('schemaService.findAll listener failed', err);
          this.notificationService.error('Lost connection to schema updates. Retrying…');
          const delay = Math.min(30000, 1000 * 2 ** attempt);
          setTimeout(() => this.subscribeToSchemas(spaceId, attempt + 1), delay);
        },
      });
  }

  ngOnInit(): void {
    // Emits immediately, then every 5 minutes: without the leading 0 the build date is unknown for
    // the first five minutes of every session, and anything keyed on it renders blank.
    timer(0, 300000)
      .pipe(
        mergeMap(() => this.versionService.checkRemoteVersion()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(remoteVersion => {
        console.log('remoteVersion', remoteVersion);
        const currentVersion = this.currentVersion();
        if (currentVersion) {
          if (currentVersion.version !== remoteVersion.version) {
            window.location.reload();
          } else if (currentVersion.gitCommitSha !== remoteVersion.gitCommitSha) {
            this.notificationService.info('New version is available', {
              position: 'bottom-left',
              description: "We've just rolled out an update! Refresh the page to get the latest improvements.",
              duration: 300000,
              action: { type: 'action', label: 'Reload', onClick: () => window.location.reload() },
              cancel: { label: 'Skip' },
            });
          }
        } else {
          this.currentVersion.set(remoteVersion);
        }
      });
  }

  onSpaceSelection(space: Space): void {
    this.spaceStore.changeSpace(space);
    this.router.navigate(['features', 'spaces', space.id, 'dashboard']);
  }

  async onLogoutClick(): Promise<void> {
    return await signOut(this.auth);
  }

  /** Release notes ship with the build, so the dialog needs no context of its own. */
  openWhatsNew(): void {
    this.hlmDialog.open(WhatsNewDialogComponent, { contentClass: WHATS_NEW_DIALOG_CONTENT_CLASS });
    // Recorded on open rather than on close: the notes are on screen either way, and a user who
    // dismisses with Escape has still seen them.
    this.localeSettingsStore.setLastSeenWhatsNewVersion(WHATS_NEW[0].version);
  }

  openNewTab(link: string): void {
    window.open(link);
  }

  switchTheme() {
    this.localeSettingsStore.setTheme(this.localeSettingsStore.theme() === 'dark' ? 'light' : 'dark');
  }

  private buildBreadcrumbs(route: ActivatedRoute): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentRoute: ActivatedRoute | null = route;
    while (currentRoute) {
      if (currentRoute.routeConfig && currentRoute.routeConfig.data && currentRoute.routeConfig.data['breadcrumb']) {
        const currentItem = currentRoute.routeConfig.data['breadcrumb'] as BreadcrumbItem | undefined;
        if (currentItem) {
          if (currentItem.route) {
            // If route is defined in breadcrumb data, use it
            breadcrumbs.push(currentItem);
          } else {
            // Otherwise, build the route from the current route snapshot
            const urlSegments = currentRoute.snapshot.url.map(segment => segment.path).join('/');
            const parentUrl = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].route || '' : '';
            const fullPath = parentUrl.endsWith('/') || parentUrl === '' ? `${parentUrl}${urlSegments}` : `${parentUrl}/${urlSegments}`;
            breadcrumbs.push({ ...currentItem, route: fullPath });
          }
        }
      }
      currentRoute = currentRoute.firstChild;
    }
    return breadcrumbs;
  }
}
