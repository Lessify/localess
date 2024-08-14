import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap } from 'rxjs';
import { SettingsService } from '@shared/services/settings.service';
import { AppUi } from '@shared/models/settings.model';

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
            next: response => {
              console.log('Loaded Settings', response);
              if (response) {
                patchState(state, { ui: response.ui });
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
