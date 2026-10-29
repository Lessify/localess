import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import type { Integration, IntegrationList } from '@localess/shared';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { IntegrationService } from './integration.service';
import { IntegrationsComponent } from './integrations.component';

const off = (id: Integration['id']): Integration => ({ id, source: 'none', enabled: false, envVars: [], hints: {} });
const on = (id: Integration['id']): Integration => ({ id, source: 'ui', enabled: true, envVars: [], hints: {}, status: 'verified' });

describe('IntegrationsComponent', () => {
  function setup(list: IntegrationList) {
    TestBed.configureTestingModule({
      providers: [
        { provide: IntegrationService, useValue: { findAll: () => of(list), setTranslatePrimary: vi.fn(() => of(list.translatePrimary)) } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: HlmDialogService, useValue: { open: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(IntegrationsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { element, text: () => element.textContent ?? '' };
  }

  it('groups the cards by category', () => {
    const { element } = setup({
      integrations: [off('deepl'), off('google-translate'), off('unsplash')],
      translatePrimary: { value: 'deepl', source: 'default' },
    });
    expect([...element.querySelectorAll('h2')].map(it => it.textContent?.trim())).toEqual(['Machine translation', 'Assets']);
    expect(element.querySelectorAll('ll-integration-card')).toHaveLength(3);
  });

  it('offers the primary provider only when both translation providers are on', () => {
    const one = setup({
      integrations: [on('deepl'), off('google-translate'), off('unsplash')],
      translatePrimary: { value: 'deepl', source: 'default' },
    });
    expect(one.text()).not.toContain('tried first');
    TestBed.resetTestingModule();
    const both = setup({
      integrations: [on('deepl'), on('google-translate'), off('unsplash')],
      translatePrimary: { value: 'deepl', source: 'default' },
    });
    expect(both.text()).toContain('tried first');
    expect([...both.element.querySelectorAll('[data-primary] button')].map(it => it.textContent?.trim())).toEqual(['DeepL', 'Google']);
  });

  it('locks the primary provider set in the environment', () => {
    const { text, element } = setup({
      integrations: [on('deepl'), on('google-translate'), off('unsplash')],
      translatePrimary: { value: 'google-translate', source: 'env' },
    });
    expect(text()).toContain('Server configuration');
    expect([...element.querySelectorAll('[data-primary] button')].every(it => (it as HTMLButtonElement).disabled)).toBe(true);
  });
});
