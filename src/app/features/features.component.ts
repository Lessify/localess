import browser from 'browser-detect';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  Optional
} from '@angular/core';
import {MatSelectChange} from '@angular/material/select';
import {select, Store} from '@ngrx/store';
import {combineLatest, from, Observable} from 'rxjs';

import {
  AppState,
  authLogin,
  authLogout,
  LocalStorageService,
  routeAnimations,
  selectIsAuthenticated,
  selectSettingsLanguage,
  selectSettingsStickyHeader
} from '../core/core.module';
import {
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeLanguage
} from '../core/state/settings/settings.actions';
import {Auth, signOut, user} from '@angular/fire/auth';
import {actionUserChange, actionUserRoleChange} from '../core/state/user/user.actions';
import {actionSpaceChange} from '../core/state/space/space.actions';
import {ActivatedRoute, Router} from '@angular/router';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {selectSpace} from '../core/state/space/space.selector';
import {environment} from '../../environments/environment';

const ROLE_READ = 'read';
const ROLE_EDIT = 'edit';
const ROLE_WRITE = 'write';
const ROLE_ADMIN = 'admin';

interface SideMenuItem {
  icon: string;
  link: string;
  label: string;
  roles?: string[];
}

@Component({
  selector: 'll-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routeAnimations]
})
export class FeaturesComponent implements OnInit {
  isRoleNone = false;
  isRoleRead = false;
  isRoleEdit = false;
  isRoleWrite = false;
  isRoleAdmin = false;
  role = 'none';
  spaces: Space[] = [];
  selectedSpace?: Space;
  title: string = 'Title'
  year = new Date().getFullYear();
  logo = 'assets/logo.png';
  version = environment.version

  userSideMenu: SideMenuItem[] = [
    {link: 'translations', label: 'Translations', icon: 'translate', roles: [ROLE_READ, ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN]},
    {link: 'content', label: 'Content', icon: 'article', roles: [ROLE_READ, ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN]},
    {link: 'schematics', label: 'Schematics', icon: 'schema', roles: [ROLE_ADMIN]},
    {link: 'locales', label: 'Locales', icon: 'language', roles: [ROLE_ADMIN]}
  ];

  adminSideMenu: SideMenuItem[] = [
    {link: 'users', label: 'Users', icon: 'people'},
    {link: 'spaces', label: 'Spaces', icon: 'space_dashboard'}
  ];

  communitySideMenu: SideMenuItem[] = [
    {link: 'https://github.com/Lessify/localess', label: 'Code', icon: 'code'},
    {link: 'https://github.com/Lessify/localess/issues', label: 'Feedback', icon: 'forum'},
    {link: 'https://github.com/Lessify/localess/wiki', label: 'Help', icon: 'help'},
    {link: 'https://github.com/Lessify/localess/releases', label: 'Releases', icon: 'new_releases'},
  ];

  isAuthenticated$: Observable<boolean> | undefined;
  stickyHeader$: Observable<boolean> | undefined;
  language$: Observable<string> | undefined;

  constructor(
    private readonly spaceService: SpaceService,
    private readonly store: Store<AppState>,
    private readonly storageService: LocalStorageService,
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Optional() private auth: Auth
  ) {
    user(this.auth)
    .subscribe((user) => {
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
            role: 'none',
            photoURL: user.photoURL
          })
        );
        from(user.getIdTokenResult())
        .subscribe((token) => {
          if (token.claims['role']) {
            const role = token.claims['role'].toString();
            this.role = role;
            this.store.dispatch(actionUserRoleChange({role}));
            if (role === ROLE_ADMIN) {
              this.isRoleAdmin = true;
            } else if (role === ROLE_WRITE) {
              this.isRoleWrite = true;
            } else if (role === ROLE_EDIT) {
              this.isRoleEdit = true;
            } else if (role === ROLE_READ) {
              this.isRoleRead = true;
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

  filterMenuByRole(menu: SideMenuItem[], role: string): SideMenuItem[] {
    return menu.filter(it => it.roles ? it.roles.includes(role) : true)
  }

  private static isIEorEdgeOrSafari(): boolean {
    return ['ie', 'edge', 'safari'].includes(browser().name || '');
  }

  ngOnInit(): void {
    this.storageService.testLocalStorage();
    if (FeaturesComponent.isIEorEdgeOrSafari()) {
      this.store.dispatch(
        actionSettingsChangeAnimationsPageDisabled({
          pageAnimationsDisabled: true
        })
      );
    }

    this.isAuthenticated$ = this.store.pipe(select(selectIsAuthenticated));
    this.stickyHeader$ = this.store.pipe(select(selectSettingsStickyHeader));
    this.language$ = this.store.pipe(select(selectSettingsLanguage));

    this.loadData()
  }

  loadData(): void {
    combineLatest([
      this.spaceService.findAll(),
      this.store.select(selectSpace)
    ])
    .subscribe({
      next: ([spaces, space]) => {
        if (spaces.length === 0) {
          this.selectedSpace = undefined
        }
        //Spaces change
        /*        if (this.spaces.length !== spaces.length) {
                  if (this.spaces.length > spaces.length) {
                    this.selectedSpace = undefined
                  }
                }*/
        //Selected Space change
        if (space.id !== this.selectedSpace?.id) {
          let selected = spaces.find(it => it.id === space.id)
          if (selected == null && spaces.length > 0) {
            selected = spaces[0]
          }
          if (selected) {
            this.selectedSpace = selected
            this.store.dispatch(actionSpaceChange(selected))
          }
        }
        this.spaces = spaces
        this.cd.markForCheck()
      }
    })
  }

  onSpaceSelection(element: Space): void {
    this.store.dispatch(actionSpaceChange(element))
  }

  onLoginClick(): void {
    this.store.dispatch(authLogin());
  }

  async onLogoutClick(): Promise<void> {
    this.store.dispatch(authLogout());
    return await signOut(this.auth);
  }

  onLanguageSelect(event: MatSelectChange): void {
    this.store.dispatch(actionSettingsChangeLanguage({language: event.value}));
  }

  openNewTab(link: string): void {
    window.open(link)
  }
}
