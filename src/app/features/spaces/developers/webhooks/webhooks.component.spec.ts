import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Router } from '@angular/router';
import { Space } from '@shared/models/space.model';
import { WebHook, WebHookEvent } from '@shared/models/webhook.model';
import { NotificationService } from '@shared/services/notification.service';
import { WebHookService } from '@shared/services/webhook.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { WebhooksComponent } from './webhooks.component';

function space(id: string): Space {
  return { id, name: `Space ${id}` } as unknown as Space;
}

function webhook(overrides: Partial<WebHook> = {}): WebHook {
  return { id: 'w1', name: 'Slack', url: 'https://example.com', enabled: true, events: [WebHookEvent.CONTENT_PUBLISHED], ...overrides } as WebHook;
}

describe('WebhooksComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(webhooks: WebHook[] = []) {
    const findAll = vi.fn().mockReturnValue(of(webhooks));
    const create = vi.fn().mockReturnValue(of(undefined));
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
        { provide: WebHookService, useValue: { findAll, create, update, updateStatus, delete: deleteWebhook } },
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

    expect(findAll).toHaveBeenCalledWith('space-1');
    expect(component.dataSource.filteredData()).toEqual(webhooks);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup();

    component.onFilterChange({ search: 'slack' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'slack' }));
  });

  it('navigateToDetail() navigates to the webhook detail route', () => {
    const { component, navigate } = setup();

    component.navigateToDetail(webhook({ id: 'w1' }));

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'developers', 'webhooks', 'w1']);
  });

  it('openAddDialog() creates the webhook and notifies success when confirmed', () => {
    const { component, open, create, success } = setup();
    const model = { name: 'Slack', url: 'https://example.com', events: [WebHookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ closed$: of(model) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been created.');
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
    const model = { name: 'Renamed', url: 'https://example.com', events: [WebHookEvent.CONTENT_PUBLISHED] };
    open.mockReturnValue({ closed$: of(model) });

    component.openEditDialog(webhook({ id: 'w1' }));

    expect(update).toHaveBeenCalledWith('space-1', 'w1', model);
    expect(success).toHaveBeenCalledWith('Webhook has been updated.');
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

    expect(component['eventsToText']([WebHookEvent.CONTENT_PUBLISHED, WebHookEvent.CONTENT_CHANGED])).toBe(
      'content.published\ncontent.changed',
    );
  });
});
