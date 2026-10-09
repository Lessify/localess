import { TestBed } from '@angular/core/testing';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';

import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup() {
    TestBed.overrideComponent(AuthComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(AuthComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, store: TestBed.inject(LocalSettingsStore) };
  }

  it('switchTheme toggles from light to dark', () => {
    const { component, store } = setup();
    store.setTheme('light');

    component.switchTheme();

    expect(store.theme()).toBe('dark');
  });

  it('switchTheme toggles from dark to light', () => {
    const { component, store } = setup();
    store.setTheme('dark');

    component.switchTheme();

    expect(store.theme()).toBe('light');
  });
});
