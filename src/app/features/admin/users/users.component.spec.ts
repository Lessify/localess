import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { User } from '@shared/models/user.model';
import { NotificationService } from '@shared/services/notification.service';
import { UserService } from '@shared/services/user.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UsersComponent } from './users.component';

function user(overrides: Partial<User> = {}): User {
  return { id: 'u1', email: 'user@example.com', emailVerified: true, disabled: false, ...overrides } as User;
}

describe('UsersComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(users: User[] = [], findAllImpl?: () => ReturnType<typeof of>) {
    const findAll = findAllImpl ? vi.fn(findAllImpl) : vi.fn().mockReturnValue(of(users));
    const invite = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteUser = vi.fn().mockReturnValue(of(undefined));
    const sync = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(UsersComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { findAll, invite, update, delete: deleteUser, sync } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, invite, update, deleteUser, sync, success, error, open };
  }

  it('loads users on init', () => {
    const users = [user({ id: 'u1' }), user({ id: 'u2' })];
    const { component, findAll } = setup(users);

    expect(findAll).toHaveBeenCalled();
    expect(component.dataSource.filteredData()).toEqual(users);
    expect(component.isLoading()).toBe(false);
  });

  it('notifies an error and stops loading when users fail to load', () => {
    const { component, error } = setup([], () => throwError(() => new Error('boom')));

    expect(error).toHaveBeenCalledWith('Users can not be loaded.');
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup();

    component.onFilterChange({ search: 'user' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'user' }));
  });

  it('inviteDialog() invites the user and notifies success when confirmed', () => {
    const { component, open, invite, success } = setup();
    const model = { email: 'new@example.com', password: 'secret123' };
    open.mockReturnValue({ closed$: of(model) });

    component.inviteDialog();

    expect(invite).toHaveBeenCalledWith(model);
    expect(success).toHaveBeenCalledWith('User has been invited.');
  });

  it('inviteDialog() does nothing when dismissed', () => {
    const { component, open, invite } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.inviteDialog();

    expect(invite).not.toHaveBeenCalled();
  });

  it('inviteDialog() notifies an error on failure', () => {
    const { component, open, invite, error } = setup();
    invite.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ email: 'new@example.com', password: 'secret123' }) });

    component.inviteDialog();

    expect(error).toHaveBeenCalledWith('User can not be invited.');
  });

  it('openEditDialog() updates the user and notifies success when confirmed', () => {
    const { component, open, update, success } = setup();
    open.mockReturnValue({ closed$: of({ role: 'admin' }) });

    component.openEditDialog(user({ id: 'u1' }));

    expect(update).toHaveBeenCalledWith('u1', { role: 'admin' });
    expect(success).toHaveBeenCalledWith('User has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup();
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ role: 'admin' }) });

    component.openEditDialog(user({ id: 'u1' }));

    expect(error).toHaveBeenCalledWith('User can not be updated.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteUser, success } = setup();
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(user({ id: 'u1', email: 'user@example.com' }));

    expect(deleteUser).toHaveBeenCalledWith('u1');
    expect(success).toHaveBeenCalledWith("User 'user@example.com' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteUser } = setup();
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(user({ id: 'u1' }));

    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteUser, error } = setup();
    deleteUser.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(user({ id: 'u1', email: 'user@example.com' }));

    expect(error).toHaveBeenCalledWith("User 'user@example.com' can not be deleted.");
  });

  it('sync() notifies success and resets the loading flag after a delay', async () => {
    vi.useFakeTimers();
    const { component, success } = setup();

    component.sync();

    expect(component.isSyncLoading()).toBe(true);
    expect(success).toHaveBeenCalledWith('Sync is in progress, it may take upt to few minutes.');

    await vi.advanceTimersByTimeAsync(1000);

    expect(component.isSyncLoading()).toBe(false);
  });

  it('sync() notifies an error on failure', () => {
    const { component, sync, error } = setup();
    sync.mockReturnValue(throwError(() => new Error('boom')));

    component.sync();

    expect(error).toHaveBeenCalledWith('Users can not be synced.');
  });
});
