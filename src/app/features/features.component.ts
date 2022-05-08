import browser from 'browser-detect';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Optional } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { select, Store } from '@ngrx/store';
import { from, Observable } from 'rxjs';

import { environment as env } from '../../environments/environment';

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
import { Auth, authState, signOut } from '@angular/fire/auth';
import { actionUserChange, actionUserRoleChange } from '../core/state/user/user.actions';

interface SideMenuItem {
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
  year = new Date().getFullYear();
  logo = 'assets/logo.png';
  languages = ['en', 'de', 'sk', 'fr', 'es', 'pt-br', 'zh-cn', 'he'];
  navigation = [
    { link: 'about', label: 'lea.menu.about' },
    { link: 'feature-list', label: 'lea.menu.features' },
    { link: 'examples', label: 'lea.menu.examples' }
  ];
  adminSideMenu: SideMenuItem[] = [
    { link: 'orders', label: 'lea.menu.orders' },
    { link: 'products', label: 'lea.menu.products' },
    { link: 'variant-attributes', label: 'lea.menu.variant-attributes' },
    { link: 'categories', label: 'lea.menu.categories' },
    { link: 'customers', label: 'lea.menu.customers' },
    { link: 'discounts', label: 'lea.menu.discounts' }
  ];
  userSideMenu: SideMenuItem[] = [{ link: 'orders', label: 'lea.menu.orders' }];

  otherSideMenu: SideMenuItem[] = [{ link: 'settings', label: 'lea.menu.settings' }];

  isAuthenticated$: Observable<boolean> | undefined;
  stickyHeader$: Observable<boolean> | undefined;
  language$: Observable<string> | undefined;

  constructor(
    private store: Store<AppState>,
    private storageService: LocalStorageService,
    private readonly cd: ChangeDetectorRef,
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
            this.store.dispatch(actionUserRoleChange({ role }));
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
  }

  onLoginClick() {
    this.store.dispatch(authLogin());
  }

  async onLogoutClick(): Promise<void> {
    this.store.dispatch(authLogout());
    return await signOut(this.auth);
  }

  onLanguageSelect(event: MatSelectChange) {
    this.store.dispatch(actionSettingsChangeLanguage({ language: event.value }));
  }
}
