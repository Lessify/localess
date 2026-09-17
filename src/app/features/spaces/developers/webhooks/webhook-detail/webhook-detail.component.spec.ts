import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { WebHook, WebHookEvent, WebHookLog, WebHookStatus } from '@shared/models/webhook.model';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { WebhookDetailComponent } from './webhook-detail.component';

function webhook(overrides: Partial<WebHook> = {}): WebHook {
  return { id: 'w1', name: 'Slack', url: 'https://example.com', enabled: true, events: [WebHookEvent.CONTENT_PUBLISHED], ...overrides } as WebHook;
}

describe('WebhookDetailComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(found: WebHook, logs: WebHookLog[] = []) {
    const findById = vi.fn().mockReturnValue(of(found));
    const findLogs = vi.fn().mockReturnValue(of(logs));
    const update = vi.fn().mockReturnValue(of(undefined));
    const updateStatus = vi.fn().mockReturnValue(of(undefined));
    const deleteWebhook = vi.fn().mockReturnValue(of(undefined));
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const openConfirm = vi.fn();

    TestBed.overrideComponent(WebhookDetailComponent, { set: { template: '<ll-paginator [length]="0" />' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: WebHookService, useValue: { findById, findLogs, update, updateStatus, delete: deleteWebhook } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: Router, useValue: { navigate } },
        { provide: MatDialog, useValue: { open } },
        { provide: HlmDialogService, useValue: { open: openConfirm } },
        { provide: SpaceStore, useValue: { selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(WebhookDetailComponent);
    fixture.componentRef.setInput('webhookId', 'w1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, findById, findLogs, update, updateStatus, deleteWebhook, navigate, success, error, open, openConfirm };
  }

  it('loads the webhook and its logs on init', () => {
    const found = webhook();
    const logs: WebHookLog[] = [{ id: 'l1', event: WebHookEvent.CONTENT_PUBLISHED, status: WebHookStatus.SUCCESS } as unknown as WebHookLog];
    const { component, findById, findLogs } = setup(found, logs);

    expect(findById).toHaveBeenCalledWith('space-1', 'w1');
    expect(findLogs).toHaveBeenCalledWith('space-1', 'w1');
    expect(component.webhook()).toEqual(found);
    expect(component.dataSource.filteredData()).toEqual(logs);
    expect(component.isLoading()).toBe(false);
    expect(component.isLogsLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup(webhook());

    component.onFilterChange({ search: 'w1' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'w1' }));
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
    const model = { name: 'Renamed', url: 'https://example.com', events: [WebHookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ afterClosed: () => of(model) });

    component.openEditDialog();

    expect(update).toHaveBeenCalledWith('space-1', 'w1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup(webhook({ id: 'w1' }));
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ name: 'Renamed', url: 'https://example.com', events: [] }) });

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
    const { component, openConfirm, deleteWebhook, success, navigate } = setup(webhook({ id: 'w1', name: 'Slack' }));
    openConfirm.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog();

    expect(deleteWebhook).toHaveBeenCalledWith('space-1', 'w1');
    expect(success).toHaveBeenCalledWith("Webhook 'Slack' has been deleted.");
    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'developers', 'webhooks']);
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, openConfirm, deleteWebhook } = setup(webhook({ id: 'w1' }));
    openConfirm.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog();

    expect(deleteWebhook).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, openConfirm, deleteWebhook, error } = setup(webhook({ id: 'w1', name: 'Slack' }));
    deleteWebhook.mockReturnValue(throwError(() => new Error('boom')));
    openConfirm.mockReturnValue({ closed$: of(true) });

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

    expect(component['eventsToText']([WebHookEvent.CONTENT_PUBLISHED, WebHookEvent.CONTENT_CHANGED])).toBe(
      'content.published\ncontent.changed',
    );
  });
});
