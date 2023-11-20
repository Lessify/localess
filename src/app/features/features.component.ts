import browser from 'browser-detect';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, Optional } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { select, Store } from '@ngrx/store';
import { combineLatest, from, Observable } from 'rxjs';

import {
  AppState,
  authLogin,
  authLogout,
  LocalStorageService,
  routeAnimations,
  selectIsAuthenticated,
  selectSettingsLanguage,
  selectSettingsStickyHeader,
} from '@core/core.module';
import {
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeDebugEnabled,
  actionSettingsChangeLanguage,
  actionSettingsChangeMainMenuExpended,
} from '@core/state/settings/settings.actions';
import { Auth, signOut, user } from '@angular/fire/auth';
import { actionUserChange, actionUserRoleChange } from '@core/state/user/user.actions';
import { actionSpaceChange } from '@core/state/space/space.actions';
import { ActivatedRoute, Router } from '@angular/router';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { selectSpace } from '@core/state/space/space.selector';
import { environment } from '../../environments/environment';
import { USER_PERMISSIONS_IMPORT_EXPORT, UserPermission, UserRole } from '@shared/models/user.model';
import { DEFAULT_LOCALE } from '@shared/models/locale.model';
import { selectSettings } from '@core/state/settings/settings.selectors';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { Release } from '@shared/generated/github/models/release';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const ROLE_ADMIN = 'admin';

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
  styleUrls: ['./features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routeAnimations],
})
export class FeaturesComponent implements OnInit {
  userPermission = UserPermission;

  // Settings
  isSettingsMenuExpended = false;
  isDebug = environment.debug;

  isRoleNone = false;
  isRoleAdmin = false;
  spaces: Space[] = [];
  selectedSpace?: Space;
  logo = 'assets/logo.png';
  version = environment.version;
  release?: Release;

  userSideMenu: SideMenuItem[] = [
    { link: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { link: 'translations', label: 'Translations', icon: 'translate', permission: UserPermission.TRANSLATION_READ },
    { link: 'contents', label: 'Content', icon: 'web_stories', permission: UserPermission.CONTENT_READ },
    { link: 'assets', label: 'Assets', icon: 'attachment', permission: UserPermission.ASSET_READ },
    { link: 'schemas', label: 'Schemas', icon: 'schema', permission: UserPermission.SCHEMA_READ },
    { link: 'tasks', label: 'Tasks', icon: 'task', permission: USER_PERMISSIONS_IMPORT_EXPORT },
    // { link: 'plugins', label: 'Plugins', icon: 'extension', permission: UserPermission.SPACE_MANAGEMENT },
  ];

  adminSideMenu: SideMenuItem[] = [
    { link: 'users', label: 'Users', icon: 'people', permission: UserPermission.USER_MANAGEMENT },
    { link: 'spaces', label: 'Spaces', icon: 'space_dashboard', permission: UserPermission.SPACE_MANAGEMENT },
  ];

  communitySideMenu: SideMenuItem[] = [
    { link: 'https://github.com/sponsors/Lessify', label: 'Sponsor', icon: 'volunteer_activism' },
    { link: 'https://github.com/Lessify/localess', label: 'Code', icon: 'code' },
    { link: 'https://github.com/Lessify/localess/issues', label: 'Feedback', icon: 'forum' },
    { link: 'https://github.com/Lessify/localess/wiki', label: 'Help', icon: 'help' },
  ];

  isAuthenticated$: Observable<boolean> | undefined;
  stickyHeader$: Observable<boolean> | undefined;
  language$: Observable<string> | undefined;
  settings$ = this.store.select(selectSettings);

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly spaceService: SpaceService,
    private readonly store: Store<AppState>,
    private readonly storageService: LocalStorageService,
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly reposService: ReposService,
    @Optional() private auth: Auth
  ) {
    reposService
      .reposGetLatestRelease({ owner: 'Lessify', repo: 'localess' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          //console.log(value)
          this.release = value;
        },
      });
    user(this.auth)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        // Sign-in
        if (user) {
          // console.log(user);
          // const tokenResult = await user.getIdTokenResult()
          this.store.dispatch(
            actionUserChange({
              id: user.uid,
              displayName: user.displayName,
              email: user.email,
              emailVerified: user.emailVerified,
              role: undefined,
              photoURL: user.photoURL,
              permissions: undefined,
            })
          );
          from(user.getIdTokenResult()).subscribe(token => {
            if (token.claims['role'] || token.claims['permissions']) {
              const role = token.claims['role'] as UserRole | undefined;
              const permissions = token.claims['permissions'] as string[] | undefined;
              this.store.dispatch(actionUserRoleChange({ role, permissions }));
              if (role === ROLE_ADMIN) {
                this.isRoleAdmin = true;
              }
            } else {
              this.isRoleNone = true;
            }
            this.cd.markForCheck();
          });
        } else {
          this.store.dispatch(authLogout());
        }
      });
  }

  private static isIEorEdgeOrSafari(): boolean {
    return ['ie', 'edge', 'safari'].includes(browser().name || '');
  }

  ngOnInit(): void {
    this.storageService.testLocalStorage();
    if (FeaturesComponent.isIEorEdgeOrSafari()) {
      this.store.dispatch(
        actionSettingsChangeAnimationsPageDisabled({
          pageAnimationsDisabled: true,
        })
      );
    }

    this.isAuthenticated$ = this.store.pipe(select(selectIsAuthenticated)).pipe(takeUntilDestroyed(this.destroyRef));
    this.stickyHeader$ = this.store.pipe(select(selectSettingsStickyHeader)).pipe(takeUntilDestroyed(this.destroyRef));
    this.language$ = this.store.pipe(select(selectSettingsLanguage)).pipe(takeUntilDestroyed(this.destroyRef));

    this.loadData();
  }

  loadData(): void {
    combineLatest([this.spaceService.findAll(), this.store.select(selectSpace)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([spaces, space]) => {
          if (spaces.length === 0) {
            this.selectedSpace = undefined;
          }
          //Spaces change
          /*        if (this.spaces.length !== spaces.length) {
                    if (this.spaces.length > spaces.length) {
                      this.selectedSpace = undefined
                    }
                  }*/
          //Selected Space change
          if (space.id !== this.selectedSpace?.id) {
            let selected = spaces.find(it => it.id === space.id);
            if (selected == null && spaces.length > 0) {
              selected = spaces[0];
            }
            if (selected) {
              this.selectedSpace = selected;
              this.store.dispatch(actionSpaceChange(selected));
            }
          }
          this.generateUserSideMenu(this.selectedSpace!.id);
          this.spaces = spaces;
          this.cd.markForCheck();
        },
      });
  }

  generateUserSideMenu(spaceId: string): void {
    this.userSideMenu = [
      { link: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { link: 'translations', label: 'Translations', icon: 'translate', permission: UserPermission.TRANSLATION_READ },
      { link: 'contents', label: 'Content', icon: 'web_stories', permission: UserPermission.CONTENT_READ },
      { link: 'assets', label: 'Assets', icon: 'attachment', permission: UserPermission.ASSET_READ },
      { link: 'schemas', label: 'Schemas', icon: 'schema', permission: UserPermission.SCHEMA_READ },
      { link: 'tasks', label: 'Tasks', icon: 'task', permission: USER_PERMISSIONS_IMPORT_EXPORT },
      // { link: 'plugins', label: 'Plugins', icon: 'extension', permission: UserPermission.SPACE_MANAGEMENT },
      { link: `spaces/${spaceId}/settings`, label: 'Settings', icon: 'settings', permission: UserPermission.SPACE_MANAGEMENT },
    ];
  }

  onSpaceSelection(element: Space): void {
    this.store.dispatch(actionSpaceChange(element));
    this.router.navigate(['features']);
  }

  onLoginClick(): void {
    this.store.dispatch(authLogin());
  }

  async onLogoutClick(): Promise<void> {
    this.store.dispatch(authLogout());
    return await signOut(this.auth);
  }

  onLanguageSelect(event: MatSelectChange): void {
    this.store.dispatch(actionSettingsChangeLanguage({ language: event.value }));
  }

  onMainMenuExpendedChangeState(): void {
    this.store.dispatch(actionSettingsChangeMainMenuExpended());
  }

  onSettingsMenuExpendedChangeState(): void {
    this.isSettingsMenuExpended = !this.isSettingsMenuExpended;
  }

  openNewTab(link: string): void {
    window.open(link);
  }

  protected readonly DEFAULT_LOCALE = DEFAULT_LOCALE;

  onDebugEnabledChangeState() {
    this.store.dispatch(actionSettingsChangeDebugEnabled());
  }
}
