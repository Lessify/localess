import { inject } from '@angular/core';
import { SettingsService } from '@core/services/settings.service';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AppUi } from '@shared/models/settings.model';
import { pipe, switchMap } from 'rxjs';

export type AppSettingsState = {
  ui: AppUi | undefined;
};

const initialState: AppSettingsState = {
  ui: undefined,
};

const initialStateFactory = (): AppSettingsState => {
  return { ...initialState };
};

export const AppSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<AppSettingsState>(initialStateFactory),
  withMethods(state => {
    const settingsService = inject(SettingsService);
    return {
      load: rxMethod<void>(
        pipe(
          switchMap(() => settingsService.find()),
          tapResponse({
            next: settings => {
              if (settings) {
                patchState(state, { ui: settings.ui });
              }
            },
            error: error => {
              console.error('Error loading Settings', error);
            },
          }),
        ),
      ),
    };
  }),
  withHooks({
    onInit: store => {
      store.load();
    },
    onDestroy: store => {
      console.log('onDestroy', store);
    },
  }),
);
