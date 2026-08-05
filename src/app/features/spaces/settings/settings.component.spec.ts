import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  function setup(url: string) {
    const navigate = vi.fn();
    TestBed.overrideComponent(SettingsComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { url, navigate } }] });
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, navigate };
  }

  it('activates the tab matching the current url segment', () => {
    const { component } = setup('/features/spaces/space-1/settings/locales');

    expect(component.activeTab()).toBe('locales');
  });

  it('onTabActivated() updates the active tab and navigates to it', () => {
    const { component, navigate } = setup('/features/spaces/space-1/settings/general');

    component.onTabActivated('tokens');

    expect(component.activeTab()).toBe('tokens');
    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'settings', 'tokens']);
  });
});
