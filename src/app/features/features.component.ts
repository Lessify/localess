import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Auth, signOut } from '@angular/fire/auth';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { IconType, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeInfo,
  lucideBookOpen,
  lucideChevronDown,
  lucideChevronsUpDown,
  lucideCircleQuestionMark,
  lucideCode,
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
  lucideSend,
  lucideSettings,
  lucideShieldAlert,
  lucideShieldCheck,
  lucideSun,
  lucideToyBrick,
  lucideUserCircle,
  lucideUsers,
} from '@ng-icons/lucide';
import { tablerApi, tablerSpaces } from '@ng-icons/tabler-icons';
import { LogoComponent } from '@shared/components/logo';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { Space } from '@shared/models/space.model';
import { USER_PERMISSIONS_IMPORT_EXPORT, UserPermission } from '@shared/models/user.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentService } from '@shared/services/content.service';
import { SchemaService } from '@shared/services/schema.service';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { BrnTooltipImports } from '@spartan-ng/brain/tooltip';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBreadCrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmField, HlmFieldGroup, HlmFieldLabel, HlmFieldSet } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { cva } from 'class-variance-authority';
import { filter } from 'rxjs';
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
    RouterModule,
    CanUserPerformPipe,
    CommonModule,
    LogoComponent,
    HlmSidebarImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmAvatarImports,
    BrnTooltipImports,
    HlmButtonImports,
    HlmSeparatorImports,
    HlmBreadCrumbImports,
    HlmSheetImports,
    BrnSheetImports,
    HlmFieldGroup,
    HlmFieldSet,
    HlmField,
    HlmFieldLabel,
    HlmSwitch,
    ReactiveFormsModule,
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
      lucideCircleQuestionMark,
      lucideHeartHandshake,
      lucideEarth,
      lucideLifeBuoy,
      lucideExternalLink,
      lucideMoon,
      lucideSun,
      lucideCode,
      lucideBadgeInfo,
    }),
  ],
})
class FeaturesComponent {
  private readonly router = inject(Router);
  private readonly reposService = inject(ReposService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private readonly contentService = inject(ContentService);
  private readonly schemaService = inject(SchemaService);

  public readonly sidebarService = inject(HlmSidebarService);

  // Settings
  isSettingsMenuExpended = signal(false);
  isDebug = environment.debug;
  showDebugSettings = signal(false);

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
    { link: 'https://localess.org/home', label: 'Visit Localess.ORG', icon: 'lucideEarth' },
    { link: 'https://localess.org/docs/introduction', label: 'Documentation', icon: 'lucideBookOpen' },
    { link: 'https://github.com/Lessify/localess', label: 'Code', icon: 'lucideCode' },
    { link: 'https://github.com/Lessify/localess/issues', label: 'Feedback', icon: 'lucideSend' },
  ];

  private destroyRef = inject(DestroyRef);
  spaceStore = inject(SpaceStore);
  userStore = inject(UserStore);
  settingsStore = inject(LocalSettingsStore);
  appSettingsStore = inject(AppSettingsStore);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

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

    effect(() => {
      const selectedSpaceId = this.spaceStore.selectedSpaceId();
      if (selectedSpaceId) {
        this.contentService
          .findAllDocuments(selectedSpaceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: documents => {
              this.spaceStore.updateDocuments(documents);
            },
          });
        this.schemaService
          .findAll(selectedSpaceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: schemas => {
              this.spaceStore.updateSchemas(schemas);
            },
          });
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
      });
  }

  onSpaceSelection(space: Space): void {
    this.spaceStore.changeSpace(space);
    this.router.navigate(['features', 'spaces', space.id, 'dashboard']);
  }

  async onLogoutClick(): Promise<void> {
    return await signOut(this.auth);
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

export default FeaturesComponent;
