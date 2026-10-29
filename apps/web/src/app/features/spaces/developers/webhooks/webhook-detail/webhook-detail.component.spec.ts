import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Webhook, WebhookEvent, WebhookLog, WebhookStatus } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { WebhookLogService } from '../webhook-log.service';
import { WebhookService } from '../webhook.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { WebhookSecretDialogComponent } from '../webhook-secret-dialog/webhook-secret-dialog.component';
import { WebhookDetailComponent } from './webhook-detail.component';

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

describe('WebhookDetailComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /** `failLogs`: the logs request fails. */
  function setup(found: Webhook, logs: WebhookLog[] = [], failLogs = false) {
    const findOne = vi.fn().mockReturnValue(of(found));
    const findLogs = vi
      .fn()
      .mockReturnValue(failLogs ? throwError(() => new Error('boom')) : of({ items: logs, page: 0, size: 20, total: logs.length }));
    const update = vi.fn().mockReturnValue(of(undefined));
    const updateStatus = vi.fn().mockReturnValue(of(undefined));
    const deleteWebhook = vi.fn().mockReturnValue(of(undefined));
    const createSecret = vi.fn().mockReturnValue(of({ ...found, hasSecret: true, secret: 'whsec_new' }));
    const removeSecret = vi.fn().mockReturnValue(of(undefined));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(WebhookDetailComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WebhookService,
          useValue: { findOne, update, updateStatus, remove: deleteWebhook, createSecret, removeSecret },
        },
        {
          provide: WebhookLogService,
          useValue: { findAll: findLogs },
        },
        { provide: NotificationService, useValue: { success, error } },
        { provide: Router, useValue: { navigate } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: SpaceStore, useValue: { selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(WebhookDetailComponent);
    fixture.componentRef.setInput('webhookId', 'w1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findOne,
      findLogs,
      update,
      updateStatus,
      deleteWebhook,
      createSecret,
      removeSecret,
      navigate,
      success,
      error,
      open,
    };
  }

  it('loads the webhook and its logs on init', () => {
    const found = webhook();
    const logs: WebhookLog[] = [
      { id: 'l1', event: WebhookEvent.CONTENT_PUBLISHED, status: WebhookStatus.SUCCESS } as unknown as WebhookLog,
    ];
    const { component, findOne, findLogs } = setup(found, logs);

    expect(findOne).toHaveBeenCalledWith('space-1', 'w1');
    expect(findLogs).toHaveBeenCalledWith('space-1', 'w1', component.list.params());
    expect(component.webhook()).toEqual(found);
    expect(component.dataSource.filteredData()).toEqual(logs);
    expect(component.logsTotal()).toBe(1);
    expect(component.isLoading()).toBe(false);
    expect(component.isLogsLoading()).toBe(false);
  });

  it('onFilterChange() searches and filters the logs on the server, from the first page', () => {
    const { component, findLogs } = setup(webhook());
    component.list.page.set(3);

    component.onFilterChange({ search: ' 019a ', event: [WebhookEvent.CONTENT_PUBLISHED], status: [WebhookStatus.FAILURE] });
    TestBed.tick();

    const params = component.list.params();
    expect(component.list.page()).toBe(0);
    expect(findLogs).toHaveBeenLastCalledWith('space-1', 'w1', params);
    expect(params.get('search')).toBe('019a');
    expect(params.getAll('event')).toEqual([WebhookEvent.CONTENT_PUBLISHED]);
    expect(params.getAll('status')).toEqual([WebhookStatus.FAILURE]);
  });

  it('tells a failed logs load and stops loading them', () => {
    const { component, error } = setup(webhook(), [], true);

    expect(error).toHaveBeenCalledWith('Logs can not be loaded.');
    expect(component.isLogsLoading()).toBe(false);
  });

  it('createSecret() signs an unsigned webhook at once and shows the new secret', () => {
    const { component, createSecret, open } = setup(webhook({ hasSecret: false }));

    component.createSecret();

    expect(createSecret).toHaveBeenCalledWith('space-1', 'w1');
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      WebhookSecretDialogComponent,
      expect.objectContaining({ context: { name: 'Slack', secret: 'whsec_new' } }),
    );
  });

  it('createSecret() asks before replacing a secret; cancelled, nothing changes', () => {
    const { component, createSecret, open } = setup(webhook({ hasSecret: true }));
    open.mockReturnValueOnce({ closed$: of(false) });
    component.createSecret();
    expect(createSecret).not.toHaveBeenCalled();

    open.mockReturnValueOnce({ closed$: of(true) });
    component.createSecret();
    expect(createSecret).toHaveBeenCalledWith('space-1', 'w1');
    expect(open).toHaveBeenLastCalledWith(WebhookSecretDialogComponent, expect.anything());
  });

  it('removeSecret() asks first, then turns signing off', () => {
    const { component, removeSecret, open, success } = setup(webhook({ hasSecret: true }));
    open.mockReturnValueOnce({ closed$: of(false) });
    component.removeSecret();
    expect(removeSecret).not.toHaveBeenCalled();

    open.mockReturnValueOnce({ closed$: of(true) });
    component.removeSecret();
    expect(removeSecret).toHaveBeenCalledWith('space-1', 'w1');
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' no longer signs its deliveries.");
  });

  it('isLogExpanded()/toggleLogExpanded() track expanded log ids', () => {
    const { component } = setup(webhook());

    expect(component.isLogExpanded('l1')).toBe(false);

    component.toggleLogExpanded('l1');
    expect(component.isLogExpanded('l1')).toBe(true);

    component.toggleLogExpanded('l1');
    expect(component.isLogExpanded('l1')).toBe(false);
  });

  it('openEditDialog() updates the webhook and notifies success when confirmed', () => {
    const { component, open, update, success } = setup(webhook({ id: 'w1' }));
    const model = { name: 'Renamed', url: 'https://example.com', events: [WebhookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ closed$: of(model) });

    component.openEditDialog();

    expect(update).toHaveBeenCalledWith('space-1', 'w1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup(webhook({ id: 'w1' }));
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'Renamed', url: 'https://example.com', events: [] }) });

    component.openEditDialog();

    expect(error).toHaveBeenCalledWith('Webhook can not be updated.');
  });

  it('changeStatus() flips enabled and notifies success reflecting the new state', () => {
    const { component, updateStatus, success } = setup(webhook({ id: 'w1', name: 'Slack', enabled: true }));

    component.changeStatus();

    expect(updateStatus).toHaveBeenCalledWith('space-1', 'w1', false);
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' has been disabled.");
  });

  it('changeStatus() notifies an error on failure', () => {
    const { component, updateStatus, error } = setup(webhook({ id: 'w1', name: 'Slack', enabled: false }));
    updateStatus.mockReturnValue(throwError(() => new Error('boom')));

    component.changeStatus();

    expect(error).toHaveBeenCalledWith("Webhook 'Slack' can not be enabled.");
  });

  it('openDeleteDialog() deletes, notifies success, and navigates back when confirmed', () => {
    const { component, open, deleteWebhook, success, navigate } = setup(webhook({ id: 'w1', name: 'Slack' }));
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog();

    expect(deleteWebhook).toHaveBeenCalledWith('space-1', 'w1');
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' has been deleted.");
    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'developers', 'webhooks']);
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteWebhook } = setup(webhook({ id: 'w1' }));
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog();

    expect(deleteWebhook).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteWebhook, error } = setup(webhook({ id: 'w1', name: 'Slack' }));
    deleteWebhook.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog();

    expect(error).toHaveBeenCalledWith("Webhook 'Slack' can not be deleted.");
  });

  it('goBack() navigates to the webhooks list', () => {
    const { component, navigate } = setup(webhook());

    component.goBack();

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'developers', 'webhooks']);
  });

  it('eventsToText() joins events with newlines', () => {
    const { component } = setup(webhook());

    expect(component['eventsToText']([WebhookEvent.CONTENT_PUBLISHED, WebhookEvent.CONTENT_CHANGED])).toBe(
      'content.published\ncontent.changed',
    );
  });
});
