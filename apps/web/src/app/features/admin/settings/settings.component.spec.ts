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
    fixture.detectChanges();
    return { component: fixture.componentInstance, navigate };
  }

  it('activates the tab matching the current url segment', () => {
    const { component } = setup('/features/admin/settings/ui');

    expect(component.activeTab()).toBe('ui');
  });

  it('onTabActivated() updates the active tab and navigates to it', () => {
    const { component, navigate } = setup('/features/admin/settings/ui');

    component.onTabActivated('ui');

    expect(component.activeTab()).toBe('ui');
    expect(navigate).toHaveBeenCalledWith(['features', 'admin', 'settings', 'ui']);
  });
});
