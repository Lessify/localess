import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { WebHook, WebHookEvent } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { WebhookDialogComponent } from './webhook-dialog.component';

describe('WebhookDialogComponent', () => {
  /** What Spartan injects when the caller passes no context: never undefined, always an object with `close`. */
  const CREATE_CONTEXT = { close: () => undefined };

  function setup(context: WebHook | typeof CREATE_CONTEXT) {
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
    const { component } = setup(CREATE_CONTEXT);

    expect(component.webhookEvents).toEqual(Object.values(WebHookEvent));
  });

  it('starts with empty defaults and an invalid form when there is no data', () => {
    const { component } = setup(CREATE_CONTEXT);

    expect(component.form.value).toEqual({ name: '', url: '', events: [], signed: false, headers: [] });
    expect(component.form.invalid).toBe(true);
  });

  it('is in add mode without a webhook and in edit mode with one', () => {
    expect(setup(CREATE_CONTEXT).component.isEdit).toBe(false);
    TestBed.resetTestingModule();
    expect(
      setup({ id: 'w1', name: 'Slack', url: 'https://hooks.example.com', events: [], enabled: true } as unknown as WebHook).component
        .isEdit,
    ).toBe(true);
  });

  const existing: WebHook = {
    id: 'w1',
    name: 'Slack',
    url: 'https://example.com/hook',
    enabled: true,
    events: [WebHookEvent.CONTENT_PUBLISHED],
    hasSecret: true,
  } as unknown as WebHook;

  it('prefills the form from the given webhook', () => {
    const { component } = setup(existing);

    expect(component.form.value).toEqual({
      name: 'Slack',
      url: 'https://example.com/hook',
      events: [WebHookEvent.CONTENT_PUBLISHED],
      signed: false,
      // A kept header's name is fixed (disabled: left out of `value`), its value empty.
      headers: [],
    });
    expect(component.form.valid).toBe(true);
  });

  it('adds headers with their values when adding a webhook', () => {
    const { component, close } = setup(CREATE_CONTEXT);
    component.form.patchValue({ name: 'Slack', url: 'https://example.com/hook', events: [WebHookEvent.CONTENT_PUBLISHED] });
    component.addHeader();
    expect(component.form.valid).toBe(false); // a new header needs a name and a value
    component.headers.at(0).patchValue({ name: 'Authorization', value: 'Bearer t' });
    component.addHeader();
    component.headers.at(1).patchValue({ name: 'Bad Name', value: 'x' });
    expect(component.form.valid).toBe(false);
    component.removeHeader(1);
    expect(component.form.valid).toBe(true);

    component.save();

    expect(close).toHaveBeenLastCalledWith({
      name: 'Slack',
      url: 'https://example.com/hook',
      events: [WebHookEvent.CONTENT_PUBLISHED],
      headers: { Authorization: 'Bearer t' },
    });
  });

  it('editing keeps a header left empty (null), replaces a typed one, and drops a removed one', () => {
    const { component, close } = setup({ ...existing, headerNames: ['Authorization', 'X-Site', 'X-Old'] } as WebHook);
    expect(component.headers.length).toBe(3);
    expect(component.headers.at(0).controls['name'].disabled).toBe(true);
    expect(component.form.valid).toBe(true); // a kept value may stay empty

    component.headers.at(1).patchValue({ value: 'b' });
    component.removeHeader(2);
    component.addHeader();
    component.headers.at(2).patchValue({ name: 'X-New', value: 'n' });
    component.save();

    expect(close).toHaveBeenLastCalledWith({
      name: 'Slack',
      url: 'https://example.com/hook',
      events: [WebHookEvent.CONTENT_PUBLISHED],
      headers: { Authorization: null, 'X-Site': 'b', 'X-New': 'n' },
    });

    // Every header removed: an empty set, so the server removes them all.
    while (component.headers.length) component.removeHeader(0);
    component.save();
    expect(close).toHaveBeenLastCalledWith(expect.objectContaining({ headers: {} }));
  });

  it('asks for a signed webhook only when adding one (signing an existing one is on its page)', () => {
    const base = { name: 'Slack', url: 'https://example.com/hook', events: [WebHookEvent.CONTENT_PUBLISHED] };
    const adding = setup(CREATE_CONTEXT);
    adding.component.form.patchValue({ ...base, signed: true });
    adding.component.save();
    expect(adding.close).toHaveBeenLastCalledWith({ ...base, signed: true });
    adding.component.form.patchValue({ signed: false });
    adding.component.save();
    expect(adding.close).toHaveBeenLastCalledWith(base);

    TestBed.resetTestingModule();
    const editing = setup(existing);
    editing.component.form.patchValue({ signed: true });
    editing.component.save();
    expect(editing.close).toHaveBeenLastCalledWith({ ...base, headers: {} });
  });

  it('rejects a url without an http(s) scheme', () => {
    const { component } = setup(CREATE_CONTEXT);

    component.form.patchValue({ name: 'Slack', url: 'ftp://example.com', events: [WebHookEvent.CONTENT_PUBLISHED] });

    expect(component.form.controls['url'].valid).toBe(false);
  });

  it('rejects a name with leading/trailing spaces', () => {
    const { component } = setup(CREATE_CONTEXT);

    component.form.controls['name'].setValue(' Slack ');

    expect(component.form.controls['name'].valid).toBe(false);
  });

  it('requires at least one event', () => {
    const { component } = setup(CREATE_CONTEXT);

    component.form.patchValue({ name: 'Slack', url: 'https://example.com', events: [] });

    expect(component.form.controls['events'].valid).toBe(false);
  });
  it('closes with the form value when saved', () => {
    const { component, close } = setup(CREATE_CONTEXT);
    component.form.patchValue({ name: 'Slack', url: 'https://example.com', events: [] });

    component.save();
    expect(close).toHaveBeenLastCalledWith({ name: 'Slack', url: 'https://example.com', events: [] });
  });
});
