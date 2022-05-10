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
import {Auth, authState, signOut} from '@angular/fire/auth';
import {actionUserChange, actionUserRoleChange} from '../core/state/user/user.actions';
import {Space} from './spaces/spaces.model';
import {SpacesService} from './spaces/spaces.service';
import {selectSpaceState} from '../core/state/core.state';
import {actionSpaceChange} from '../core/state/space/space.actions';
import {ActivatedRoute, ActivationEnd, Router} from '@angular/router';

interface SideMenuItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routeAnimations]
})
export class FeaturesComponent implements OnInit {
  isRoleAdmin = false;
  spaces: Space[] = [];
  selectedSpace?: Space;
  title: string = 'Title'
  year = new Date().getFullYear();
  logo = 'assets/logo.png';

  adminSideMenu: SideMenuItem[] = [
    {link: 'spaces', label: 'Spaces', icon: 'space_dashboard'}
  ];
  userSideMenu: SideMenuItem[] = [
    {link: 'translates', label: 'Translates', icon: 'translate'}
  ];

  isAuthenticated$: Observable<boolean> | undefined;
  stickyHeader$: Observable<boolean> | undefined;
  language$: Observable<string> | undefined;

  constructor(
    private readonly spacesService: SpacesService,
    private readonly store: Store<AppState>,
    private readonly storageService: LocalStorageService,
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Optional() private auth: Auth
  ) {
    authState(this.auth).subscribe((user) => {
      // Sign-in
      if (user) {
        console.log(user);
        // const tokenResult = await user.getIdTokenResult()
        this.store.dispatch(
          actionUserChange({
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            emailVerified: user.emailVerified,
            role: 'user'
          })
        );
        from(user.getIdTokenResult()).subscribe((token) => {
          if (token.claims['role']) {
            const role = token.claims['role'].toString();
            this.store.dispatch(actionUserRoleChange({role}));
            if (role === 'admin') {
              this.isRoleAdmin = true;
              this.cd.markForCheck();
            }
          }
        });
      } else {
        this.store.dispatch(authLogout());
      }
    });
    //Read current Rout Title
    this.router.events.subscribe(event => {
      if(event instanceof ActivationEnd) {
        let lastChild = event.snapshot;
        while (lastChild.children.length) {
          lastChild = lastChild.children[0];
        }
        const {title} = lastChild.data;
        this.title = title
      }
    })

  }

  private static isIEorEdgeOrSafari() {
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
      this.spacesService.findAll(),
      this.store.select(selectSpaceState)
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

  onLanguageSelect(event: MatSelectChange) {
    this.store.dispatch(actionSettingsChangeLanguage({language: event.value}));
  }
}
