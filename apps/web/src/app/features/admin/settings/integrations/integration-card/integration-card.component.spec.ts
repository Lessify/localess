import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import {
  DEEPL_INTEGRATION,
  GOOGLE_TRANSLATE_INTEGRATION,
  type Integration,
  type IntegrationDefinition,
  UNSPLASH_INTEGRATION,
} from '@localess/shared';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { IntegrationService } from '../integration.service';
import { IntegrationCardComponent } from './integration-card.component';

describe('IntegrationCardComponent', () => {
  let service: {
    save: ReturnType<typeof vi.fn>;
    test: ReturnType<typeof vi.fn>;
    setEnabled: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let confirmed: boolean;

  function setup(definition: IntegrationDefinition, integration: Partial<Integration>) {
    service = {
      save: vi.fn(() => of({})),
      test: vi.fn(() => of({ ok: true, message: 'Connected to Unsplash.' })),
      setEnabled: vi.fn(() => of({})),
      remove: vi.fn(() => of(undefined)),
    };
    confirmed = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: IntegrationService, useValue: service },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: HlmDialogService, useValue: { open: vi.fn(() => ({ closed$: of(confirmed) })) } },
      ],
    });
    const fixture = TestBed.createComponent(IntegrationCardComponent);
    fixture.componentRef.setInput('definition', definition);
    fixture.componentRef.setInput('integration', {
      id: definition.id,
      source: 'none',
      enabled: false,
      envVars: [],
      hints: {},
      ...integration,
    });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = () => element.textContent ?? '';
    const button = (label: string) =>
      [...element.querySelectorAll('button')].find(it => it.textContent?.trim() === label) as HTMLButtonElement | undefined;
    const click = async (label: string) => {
      button(label)!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, element, text, button, click, component: fixture.componentInstance };
  }

  it('shows an env-locked integration read-only, naming its variable', () => {
    const { text, button, element } = setup(DEEPL_INTEGRATION, { source: 'env', enabled: true, envVars: ['DEEPL_API_KEY'] });
    expect(text()).toContain('Server configuration');
    expect(text()).toContain('Set by DEEPL_API_KEY in the server environment');
    expect(button('Test connection')).toBeDefined();
    expect(button('Replace')).toBeUndefined();
    expect(button('Disconnect')).toBeUndefined();
    expect(element.querySelector('hlm-switch button')?.hasAttribute('disabled')).toBe(true);
  });

  it('offers a generated form to connect, one input per field', async () => {
    const { text, click, element } = setup(GOOGLE_TRANSLATE_INTEGRATION, {});
    expect(text()).toContain('Not connected');
    await click('Connect');
    expect(element.querySelector('textarea')).not.toBeNull();
    expect(element.querySelector('input[type="file"]')).not.toBeNull();
    expect((element.querySelector('input#google-translate-location') as HTMLInputElement).value).toBe('global');
    const help = element.querySelector('a[href="https://console.cloud.google.com/iam-admin/serviceaccounts"]');
    expect(help?.textContent).toContain('How do I get one?');
  });

  it('keeps the form open with the reason when the key is rejected', async () => {
    const { click, element, text, component } = setup(UNSPLASH_INTEGRATION, {});
    await click('Connect');
    expect((element.querySelector('input#unsplash-apiKey') as HTMLInputElement).type).toBe('password');
    component.form()!.setValue({ apiKey: 'wrong' });
    service.save.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 422, error: { ok: false, reason: 'auth', message: 'Unsplash rejected this key.' } }),
      ),
    );
    await click('Test & enable');
    expect(service.save).toHaveBeenCalledWith('unsplash', { values: { apiKey: 'wrong' } });
    expect(text()).toContain('Unsplash rejected this key.');
    expect(element.querySelector('input#unsplash-apiKey')).not.toBeNull();
  });

  it('offers to save without testing when the provider could not be reached', async () => {
    const { click, component } = setup(UNSPLASH_INTEGRATION, {});
    await click('Connect');
    component.form()!.setValue({ apiKey: 'key' });
    service.save.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 422, error: { ok: false, reason: 'unreachable', message: "Couldn't reach Unsplash." } }),
      ),
    );
    await click('Test & enable');
    await click('Save without testing');
    expect(service.save).toHaveBeenLastCalledWith('unsplash', { values: { apiKey: 'key' }, skipTest: true });
  });

  it('shows a saved key by its hint, with its status', () => {
    const connected = setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'verified', hints: { apiKey: '••••3f9a' } });
    expect(connected.text()).toContain('Connected');
    expect(connected.text()).toContain('••••3f9a');
    for (const label of ['Test', 'Replace', 'Disconnect']) expect(connected.button(label), label).toBeDefined();
    TestBed.resetTestingModule();
    expect(setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'unverified' }).text()).toContain('Not verified');
    TestBed.resetTestingModule();
    expect(setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'rejected' }).text()).toContain('Key rejected');
    TestBed.resetTestingModule();
    expect(setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'quota' }).text()).toContain('Quota reached');
  });

  it('asks for the key again when this server cannot read it', () => {
    const { text, button } = setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'unreadable' });
    expect(text()).toContain(
      "The saved key can't be read on this server. Enter it again, or set LOCALESS_SECRET_KEY so it survives restarts.",
    );
    expect(button('Enter again')).toBeDefined();
  });

  it('disconnects after a confirmation', async () => {
    const { click } = setup(UNSPLASH_INTEGRATION, { source: 'ui', enabled: true, status: 'verified' });
    await click('Disconnect');
    expect(TestBed.inject(HlmDialogService).open).toHaveBeenCalled();
    expect(service.remove).toHaveBeenCalledWith('unsplash');
  });
});
