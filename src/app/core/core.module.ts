import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule, Optional, SkipSelf} from '@angular/core';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {RouterStateSerializer, StoreRouterConnectingModule} from '@ngrx/router-store';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FormsModule} from '@angular/forms';
import {MatSnackBarModule} from '@angular/material/snack-bar';

import {environment} from '../../environments/environment';

import {AppState, metaReducers, reducers, selectRouterState} from './state/core.state';
import {ROUTE_ANIMATIONS_ELEMENTS, routeAnimations} from './animations/route.animations';
import {AnimationsService} from './animations/animations.service';
import {AppErrorHandler} from './error-handler/app-error-handler.service';
import {CustomSerializer} from './router/custom-serializer';
import {LocalStorageService} from './local-storage/local-storage.service';
import {HttpErrorInterceptor} from './http-interceptors/http-error.interceptor';
import {NotificationService} from './notifications/notification.service';
import {SettingsEffects} from './state/settings/settings.effects';
import {
  selectEffectiveTheme,
  selectSettingsLanguage,
  selectSettingsStickyHeader
} from './state/settings/settings.selectors';
import {MatButtonModule} from '@angular/material/button';
import {AuthEffects} from './state/auth/auth.effects';
import {selectAuth, selectIsAuthenticated} from './state/auth/auth.selectors';
import {authLogin, authLogout} from './state/auth/auth.actions';
import {AuthGuardService} from './state/auth/auth-guard.service';
import {TitleStrategy} from '@angular/router';
import {PageTitleStrategy} from './title/page-title.strategy';

export {
  selectAuth,
  authLogin,
  authLogout,
  routeAnimations,
  AppState,
  LocalStorageService,
  selectIsAuthenticated,
  ROUTE_ANIMATIONS_ELEMENTS,
  AnimationsService,
  AuthGuardService,
  selectRouterState,
  NotificationService,
  selectEffectiveTheme,
  selectSettingsLanguage,
  selectSettingsStickyHeader
};

@NgModule({
  imports: [
    // angular
    CommonModule,
    HttpClientModule,
    FormsModule,

    // material
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatMenuModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatButtonModule,

    // ngrx
    StoreModule.forRoot(reducers, {metaReducers}),
    StoreRouterConnectingModule.forRoot(),
    EffectsModule.forRoot([AuthEffects, SettingsEffects]),
    environment.production
      ? []
      : StoreDevtoolsModule.instrument({
        name: 'Angular NgRx Material Starter'
      }),

    // 3rd party
  ],
  declarations: [],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true},
    {provide: ErrorHandler, useClass: AppErrorHandler},
    {provide: RouterStateSerializer, useClass: CustomSerializer},
    {provide: TitleStrategy, useClass: PageTitleStrategy}
  ],
  exports: [
    // angular
    FormsModule,

    // material
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatMenuModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatButtonModule,

    // 3rd party
  ]
})
export class CoreModule {
  constructor(
    @Optional()
    @SkipSelf()
      parentModule: CoreModule,
  ) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import only in AppModule');
    }
  }
}
