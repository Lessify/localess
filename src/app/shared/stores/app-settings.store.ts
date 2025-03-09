import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AppUi } from '@shared/models/settings.model';
import { SettingsService } from '@shared/services/settings.service';
import { combineLatest, pipe, switchMap } from 'rxjs';

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
          switchMap(() => combineLatest([settingsService.find(), settingsService.config()])),
          tapResponse({
            next: ([settings, config]) => {
              console.log('Loaded Settings', settings);
              console.log('Loaded Config', config);
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
