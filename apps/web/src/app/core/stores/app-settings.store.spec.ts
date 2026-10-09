import { TestBed } from '@angular/core/testing';
import { SettingsService } from '@core/services/settings.service';
import { of } from 'rxjs';

import { AppSettingsStore } from './app-settings.store';

describe('AppSettingsStore', () => {
  function createStore(settings: unknown) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SettingsService,
          useValue: {
            find: () => of(settings),
          },
        },
      ],
    });
    return TestBed.inject(AppSettingsStore);
  }

  it('patches ui state from a truthy settings response', () => {
    const store = createStore({ ui: { text: 'Welcome', color: 'primary' } });
    expect(store.ui()).toEqual({ text: 'Welcome', color: 'primary' });
  });

  it('leaves ui state undefined when the settings response is falsy', () => {
    const store = createStore(undefined);
    expect(store.ui()).toBeUndefined();
  });

  it('leaves ui state undefined when settings has no ui field', () => {
    const store = createStore({});
    expect(store.ui()).toBeUndefined();
  });
});
