import {Router} from '@angular/router';
import {Injectable, NgZone} from '@angular/core';
import {OverlayContainer} from '@angular/cdk/overlay';
import {select, Store} from '@ngrx/store';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {combineLatest, merge, of} from 'rxjs';
import {distinctUntilChanged, tap, withLatestFrom} from 'rxjs/operators';

import {selectSettingsState} from '../core.state';
import {LocalStorageService} from '../../local-storage/local-storage.service';
import {AnimationsService} from '../../animations/animations.service';

import {
  actionSettingsChangeAnimationsElements,
  actionSettingsChangeAnimationsPage,
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeAutoNightMode,
  actionSettingsChangeDebugEnabled,
  actionSettingsChangeHour,
  actionSettingsChangeLanguage,
  actionSettingsChangeMainMenuExpended,
  actionSettingsChangeStickyHeader,
  actionSettingsChangeTheme
} from './settings.actions';
import {selectEffectiveTheme, selectElementsAnimations, selectPageAnimations, selectSettingsLanguage} from './settings.selectors';
import {State} from './settings.model';

export const SETTINGS_KEY = 'SETTINGS';

const INIT = of('ll-init-effect-trigger');

@Injectable()
export class SettingsEffects {
  hour = 0;

  changeHour = this.ngZone.runOutsideAngular(() =>
    setInterval(() => {
      const hour = new Date().getHours();
      if (hour !== this.hour) {
        this.hour = hour;
        this.ngZone.run(() => this.store.dispatch(actionSettingsChangeHour({hour})));
      }
    }, 60_000)
  );

  persistSettings = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          actionSettingsChangeAnimationsElements,
          actionSettingsChangeAnimationsPage,
          actionSettingsChangeAnimationsPageDisabled,
          actionSettingsChangeAutoNightMode,
          actionSettingsChangeLanguage,
          actionSettingsChangeStickyHeader,
          actionSettingsChangeTheme,
          actionSettingsChangeMainMenuExpended,
          actionSettingsChangeDebugEnabled,
        ),
        withLatestFrom(this.store.pipe(select(selectSettingsState))),
        tap(([action, settings]) => this.localStorageService.setItem(SETTINGS_KEY, settings))
      ),
    {dispatch: false}
  );

  updateRouteAnimationType = createEffect(
    () =>
      merge(
        INIT,
        this.actions$.pipe(ofType(actionSettingsChangeAnimationsElements, actionSettingsChangeAnimationsPage))
      ).pipe(
        withLatestFrom(
          combineLatest([
            this.store.pipe(select(selectPageAnimations)),
            this.store.pipe(select(selectElementsAnimations))
          ])
        ),
        tap(([action, [pageAnimations, elementsAnimations]]) =>
          this.animationsService.updateRouteAnimationType(pageAnimations, elementsAnimations)
        )
      ),
    {dispatch: false}
  );

  updateTheme = createEffect(
    () =>
      merge(INIT, this.actions$.pipe(ofType(actionSettingsChangeTheme))).pipe(
        withLatestFrom(this.store.pipe(select(selectEffectiveTheme))),
        tap(([action, effectiveTheme]) => {
          const classList = this.overlayContainer.getContainerElement().classList;
          const toRemove = Array.from(classList).filter((item: string) => item.includes('-theme'));
          if (toRemove.length) {
            classList.remove(...toRemove);
          }
          classList.add(effectiveTheme);
        })
      ),
    {dispatch: false}
  );

  setTranslateServiceLanguage = createEffect(
    () =>
      this.store.pipe(
        select(selectSettingsLanguage),
        distinctUntilChanged(),
      ),
    {dispatch: false}
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private router: Router,
    private overlayContainer: OverlayContainer,
    private localStorageService: LocalStorageService,
    private animationsService: AnimationsService,
    private ngZone: NgZone
  ) {
  }
}
