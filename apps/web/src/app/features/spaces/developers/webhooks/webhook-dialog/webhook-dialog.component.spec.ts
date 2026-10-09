import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { WebHook, WebHookEvent } from '@shared/models/webhook.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { WebhookDialogComponent } from './webhook-dialog.component';

describe('WebhookDialogComponent', () => {
  function setup(context: WebHook | undefined) {
    const close = vi.fn();
    TestBed.overrideComponent(WebhookDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(WebhookDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('lists every webhook event as a selectable option', () => {
    const { component } = setup(undefined);

    expect(component.webhookEvents).toEqual(Object.values(WebHookEvent));
  });

  it('starts with empty defaults and an invalid form when there is no data', () => {
    const { component } = setup(undefined);

    expect(component.form.value).toEqual({ name: '', url: '', events: [], secret: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('prefills the form from the given webhook', () => {
    const webhook: WebHook = {
      id: 'w1',
      name: 'Slack',
      url: 'https://example.com/hook',
      enabled: true,
      events: [WebHookEvent.CONTENT_PUBLISHED],
      secret: 'shh',
    } as unknown as WebHook;

    const { component } = setup(webhook);

    expect(component.form.value).toEqual({
      name: 'Slack',
      url: 'https://example.com/hook',
      events: [WebHookEvent.CONTENT_PUBLISHED],
      secret: 'shh',
    });
    expect(component.form.valid).toBe(true);
  });

  it('rejects a url without an http(s) scheme', () => {
    const { component } = setup(undefined);

    component.form.setValue({ name: 'Slack', url: 'ftp://example.com', events: [WebHookEvent.CONTENT_PUBLISHED], secret: '' });

    expect(component.form.controls['url'].valid).toBe(false);
  });

  it('rejects a name with leading/trailing spaces', () => {
    const { component } = setup(undefined);

    component.form.controls['name'].setValue(' Slack ');

    expect(component.form.controls['name'].valid).toBe(false);
  });

  it('requires at least one event', () => {
    const { component } = setup(undefined);

    component.form.setValue({ name: 'Slack', url: 'https://example.com', events: [], secret: '' });

    expect(component.form.controls['events'].valid).toBe(false);
  });
  it('closes with the form value when saved', () => {
    const { component, close } = setup(undefined);
    component.form.patchValue({ name: 'Slack', url: 'https://example.com', events: [] });

    component.save();

    expect(close).toHaveBeenCalledWith({ name: 'Slack', url: 'https://example.com', events: [], secret: '' });
  });
});
