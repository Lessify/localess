import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Space, Webhook, WebhookEvent } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { WebhookService } from './webhook.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { WebhookSecretDialogComponent } from './webhook-secret-dialog/webhook-secret-dialog.component';
import { WebhooksComponent } from './webhooks.component';

function space(id: string): Space {
  return { id, name: `Space ${id}` } as unknown as Space;
}

function webhook(overrides: Partial<Webhook> = {}): Webhook {
  return {
    id: 'w1',
    name: 'Slack',
    url: 'https://example.com',
    enabled: true,
    events: [WebhookEvent.CONTENT_PUBLISHED],
    ...overrides,
  } as Webhook;
}

describe('WebhooksComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /** `failLoad`: the page request fails. */
  function setup(webhooks: Webhook[] = [], failLoad = false) {
    const findAll = vi
      .fn()
      .mockReturnValue(failLoad ? throwError(() => new Error('boom')) : of({ items: webhooks, page: 0, size: 20, total: webhooks.length }));
    const create = vi.fn().mockReturnValue(of(webhook({ id: 'w-new', hasSecret: false })));
    const update = vi.fn().mockReturnValue(of(undefined));
    const updateStatus = vi.fn().mockReturnValue(of(undefined));
    const deleteWebhook = vi.fn().mockReturnValue(of(undefined));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(WebhooksComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: WebhookService, useValue: { findAll, create, update, updateStatus, remove: deleteWebhook } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: Router, useValue: { navigate } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(space('space-1')), selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(WebhooksComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, create, update, updateStatus, deleteWebhook, navigate, success, error, open };
  }

  it('loads webhooks once a space is selected', () => {
    const webhooks = [webhook({ id: 'w1' }), webhook({ id: 'w2' })];
    const { component, findAll } = setup(webhooks);

    expect(findAll).toHaveBeenCalledWith('space-1', component.list.params());
    expect(component.dataSource.filteredData()).toEqual(webhooks);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() searches and filters on the server, from the first page', () => {
    const { component, findAll } = setup();
    component.list.page.set(2);

    component.onFilterChange({
      search: ' slack ',
      enabled: 'false',
      events: [WebhookEvent.CONTENT_PUBLISHED, WebhookEvent.TRANSLATION_CHANGED],
    });
    TestBed.tick();

    const params = component.list.params();
    expect(component.list.page()).toBe(0);
    expect(findAll).toHaveBeenLastCalledWith('space-1', params);
    expect(params.get('search')).toBe('slack');
    expect(params.get('enabled')).toBe('false');
    expect(params.getAll('event')).toEqual([WebhookEvent.CONTENT_PUBLISHED, WebhookEvent.TRANSLATION_CHANGED]);
  });

  it('onSortChange() sorts on the server; cleared, back to by name', () => {
    const { component } = setup();

    component.onSortChange({ active: 'updatedAt', direction: 'desc' });
    expect(component.list.params().get('sort')).toBe('updatedAt');
    expect(component.list.params().get('direction')).toBe('desc');

    component.onSortChange({ active: 'updatedAt', direction: '' });
    expect(component.list.params().has('sort')).toBe(false);
  });

  it('tells a failed load and stops loading', () => {
    const { component, error } = setup([], true);

    expect(error).toHaveBeenCalledWith('Webhooks can not be loaded.');
    expect(component.isLoading()).toBe(false);
  });

  it('navigateToDetail() navigates to the webhook detail route', () => {
    const { component, navigate } = setup();

    component.navigateToDetail(webhook({ id: 'w1' }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'developers', 'webhooks', 'w1']);
  });

  it('openAddDialog() creates the webhook and notifies success when confirmed', () => {
    const { component, open, create, success } = setup();
    const model = { name: 'Slack', url: 'https://example.com', events: [WebhookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ closed$: of(model) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been created.');
    // Unsigned: no secret to show.
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('openAddDialog() shows the secret of a signed webhook once it is created', () => {
    const { component, open, create } = setup();
    create.mockReturnValue(of(webhook({ id: 'w-new', name: 'Signed', hasSecret: true, secret: 'whsec_once' })));
    open.mockReturnValueOnce({ closed$: of({ name: 'Signed', url: 'https://example.com', events: [], signed: true }) });

    component.openAddDialog();

    expect(open).toHaveBeenLastCalledWith(
      WebhookSecretDialogComponent,
      expect.objectContaining({ context: { name: 'Signed', secret: 'whsec_once' } }),
    );
  });

  it('openAddDialog() does nothing when dismissed without a result', () => {
    const { component, open, create } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup();
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'Slack', url: 'https://example.com', events: [] }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Webhook can not be created.');
  });

  it('openEditDialog() updates the webhook and notifies success when confirmed', () => {
    const { component, open, update, success } = setup();
    const model = { name: 'Renamed', url: 'https://example.com', events: [WebhookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ closed$: of(model) });

    component.openEditDialog(webhook({ id: 'w1' }));

    expect(update).toHaveBeenCalledWith('space-1', 'w1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been updated.');
  });

  it('openAddDialog() shows why the server refused the URL', () => {
    const { component, open, create, error } = setup();
    const refused = new HttpErrorResponse({ status: 400, error: { message: 'Webhook URL is not allowed: only https URLs are allowed' } });
    create.mockReturnValue(throwError(() => refused));
    open.mockReturnValue({ closed$: of({ name: 'Local', url: 'http://127.0.0.1:8787/hook', events: [] }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Webhook can not be created: Webhook URL is not allowed: only https URLs are allowed');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup();
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'Renamed', url: 'https://example.com', events: [] }) });

    component.openEditDialog(webhook({ id: 'w1' }));

    expect(error).toHaveBeenCalledWith('Webhook can not be updated.');
  });

  it('changeStatus() flips enabled and notifies success reflecting the new state', () => {
    const { component, updateStatus, success } = setup();

    component.changeStatus(webhook({ id: 'w1', name: 'Slack', enabled: true }));

    expect(updateStatus).toHaveBeenCalledWith('space-1', 'w1', false);
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' has been disabled.");
  });

  it('changeStatus() notifies an error on failure', () => {
    const { component, updateStatus, error } = setup();
    updateStatus.mockReturnValue(throwError(() => new Error('boom')));

    component.changeStatus(webhook({ id: 'w1', name: 'Slack', enabled: false }));

    expect(error).toHaveBeenCalledWith("Webhook 'Slack' can not be enabled.");
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteWebhook, success } = setup();
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(webhook({ id: 'w1', name: 'Slack' }));

    expect(deleteWebhook).toHaveBeenCalledWith('space-1', 'w1');
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteWebhook } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(webhook({ id: 'w1' }));

    expect(deleteWebhook).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteWebhook, error } = setup();
    deleteWebhook.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(webhook({ id: 'w1', name: 'Slack' }));

    expect(error).toHaveBeenCalledWith("Webhook 'Slack' can not be deleted.");
  });

  it('eventsToText() joins events with newlines', () => {
    const { component } = setup();

    expect(component['eventsToText']([WebhookEvent.CONTENT_PUBLISHED, WebhookEvent.CONTENT_CHANGED])).toBe(
      'content.published\ncontent.changed',
    );
  });
});
