import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Page, User } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { UserService } from './user.service';
import { UserStore } from '@core/stores/user.store';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UsersComponent } from './users.component';

function user(overrides: Partial<User> = {}): User {
  return { id: 'u1', email: 'user@example.com', emailVerified: true, disabled: false, ...overrides } as User;
}

interface CurrentUser {
  id: string;
  role: string | undefined;
}

const ADMIN: CurrentUser = { id: 'adm', role: 'ADMIN' };

function userStoreOf(user: CurrentUser) {
  return { provide: UserStore, useValue: { id: signal(user.id), role: signal(user.role) } };
}

const pageOf = <T>(items: T[], params: HttpParams): Page<T> => ({
  items,
  page: Number(params.get('page')),
  size: Number(params.get('size')),
  total: items.length,
});

describe('UsersComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(users: User[] = [], findPageImpl?: (params: HttpParams) => Observable<Page<User>>, currentUser = ADMIN) {
    const findAll = vi.fn(findPageImpl ?? ((params: HttpParams) => of(pageOf(users, params))));
    const invite = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteUser = vi.fn().mockReturnValue(of(undefined));
    const updateStatus = vi.fn().mockReturnValue(of(undefined));
    const createPasswordResetLink = vi
      .fn()
      .mockReturnValue(of({ url: 'https://cms.example.com/reset?token=t', expiresAt: '2026-01-01T00:00:00.000Z' }));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(UsersComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { findAll, create: invite, update, remove: deleteUser, createPasswordResetLink, updateStatus } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
        userStoreOf(currentUser),
      ],
    });
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    const lastQuery = () => findAll.mock.calls.at(-1)![0].toString();
    return {
      fixture,
      component: fixture.componentInstance,
      findAll,
      lastQuery,
      invite,
      update,
      deleteUser,
      updateStatus,
      createPasswordResetLink,
      success,
      error,
      open,
    };
  }

  it('loads the first page on init, and shows the total', () => {
    const users = [user({ id: 'u1' }), user({ id: 'u2' })];
    const { component, lastQuery } = setup(users);

    expect(lastQuery()).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual(users);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('asks the server for the search and the Active filter, from the first page', () => {
    const { fixture, component, lastQuery } = setup();
    component.list.page.set(2);

    component.onFilterChange({ search: 'ali', active: 'inactive' });
    fixture.detectChanges();

    expect(lastQuery()).toBe('page=0&size=20&search=ali&active=inactive');
  });

  it('asks the server for the sorted column and direction', () => {
    const { fixture, component, lastQuery } = setup();

    component.onSortChange({ active: 'role', direction: 'desc' });
    fixture.detectChanges();

    expect(lastQuery()).toBe('page=0&size=20&sort=role&direction=desc');
  });

  it('keeps answering the table after a failed load: the next query change fetches again', () => {
    let calls = 0;
    const { fixture, component, findAll, error } = setup([], params =>
      ++calls === 1
        ? throwError(() => new Error('boom'))
        : of({ items: [user({ id: 'u1' })], page: Number(params.get('page')), size: 20, total: 1 }),
    );
    expect(error).toHaveBeenCalledWith('Users can not be loaded.');

    component.onFilterChange({ search: 'ali' });
    fixture.detectChanges();

    expect(findAll).toHaveBeenCalledTimes(2);
    expect(component.total()).toBe(1);
  });

  it('moves to the last page when the page shown is past the end (users deleted meanwhile)', () => {
    const { fixture, component, lastQuery } = setup([], params =>
      of({ items: Number(params.get('page')) > 2 ? [] : [user({ id: 'u' })], page: Number(params.get('page')), size: 20, total: 45 }),
    );

    component.list.page.set(5);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(lastQuery()).toBe('page=2&size=20');
  });

  it('notifies an error and stops loading when users fail to load', () => {
    const { component, error } = setup([], () => throwError(() => new Error('boom')));

    expect(error).toHaveBeenCalledWith('Users can not be loaded.');
    expect(component.isLoading()).toBe(false);
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
    open.mockReturnValue({ closed$: of({ role: 'ADMIN' }) });

    component.openEditDialog(user({ id: 'u1' }));

    expect(update).toHaveBeenCalledWith('u1', { role: 'ADMIN' });
    expect(success).toHaveBeenCalledWith('User has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup();
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ role: 'ADMIN' }) });

    component.openEditDialog(user({ id: 'u1' }));

    expect(error).toHaveBeenCalledWith('User can not be updated.');
  });

  describe('a refusal of the server (409)', () => {
    const lastAdmin = () =>
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'At least one active admin must remain', status: 409 } }));
    const reason = { description: 'At least one active admin must remain' };

    it('is shown on a failed update', () => {
      const { component, open, update, error } = setup();
      update.mockReturnValue(lastAdmin());
      open.mockReturnValue({ closed$: of({ role: null }) });
      component.openEditDialog(user());
      expect(error).toHaveBeenCalledWith('User can not be updated.', reason);
    });

    it('is shown on a failed delete', () => {
      const { component, open, deleteUser, error } = setup();
      deleteUser.mockReturnValue(lastAdmin());
      open.mockReturnValue({ closed$: of(true) });
      component.openDeleteDialog(user());
      expect(error).toHaveBeenCalledWith("User 'user@example.com' can not be deleted.", reason);
    });

    it('is shown on a failed disable', () => {
      const { component, open, updateStatus, error } = setup();
      updateStatus.mockReturnValue(lastAdmin());
      open.mockReturnValue({ closed$: of(true) });
      component.toggleDisabled(user());
      expect(error).toHaveBeenCalledWith("User 'user@example.com' can not be disabled.", reason);
    });
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

  describe('disable / enable', () => {
    it('disables after confirmation and notifies success', () => {
      const { component, open, updateStatus, success } = setup();
      open.mockReturnValue({ closed$: of(true) });

      component.toggleDisabled(user({ id: 'u1', email: 'user@example.com', disabled: false }));

      expect(open).toHaveBeenCalled();
      expect(updateStatus).toHaveBeenCalledWith('u1', { disabled: true });
      expect(success).toHaveBeenCalledWith("User 'user@example.com' has been disabled. They are signed out and cannot sign in.");
    });

    it('does not disable when cancelled', () => {
      const { component, open, updateStatus } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.toggleDisabled(user({ id: 'u1', disabled: false }));

      expect(updateStatus).not.toHaveBeenCalled();
    });

    it('enables without confirmation', () => {
      const { component, open, updateStatus, success } = setup();

      component.toggleDisabled(user({ id: 'u1', email: 'user@example.com', disabled: true }));

      expect(open).not.toHaveBeenCalled();
      expect(updateStatus).toHaveBeenCalledWith('u1', { disabled: false });
      expect(success).toHaveBeenCalledWith("User 'user@example.com' has been enabled.");
    });

    it('notifies an error on failure', () => {
      const { component, updateStatus, error } = setup();
      updateStatus.mockReturnValue(throwError(() => new Error('boom')));

      component.toggleDisabled(user({ id: 'u1', email: 'user@example.com', disabled: true }));

      expect(error).toHaveBeenCalledWith("User 'user@example.com' can not be enabled.");
    });

    it('is not offered on your own account', () => {
      const { component } = setup();
      expect(component.canChangeStatus(user({ id: ADMIN.id }))).toBe(false);
      expect(component.canChangeStatus(user({ id: 'u1' }))).toBe(true);
    });
  });

  it('copyPasswordResetLink() copies the link to the clipboard and notifies success', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const { component, createPasswordResetLink, success } = setup();

    component.copyPasswordResetLink(user({ id: 'u1', email: 'user@example.com' }));
    await vi.waitFor(() => expect(success).toHaveBeenCalled());

    expect(createPasswordResetLink).toHaveBeenCalledWith('u1');
    expect(writeText).toHaveBeenCalledWith('https://cms.example.com/reset?token=t');
    writeText.mockRestore();
  });

  it('copyPasswordResetLink() notifies an error on failure', () => {
    const { component, createPasswordResetLink, error } = setup();
    createPasswordResetLink.mockReturnValue(throwError(() => new Error('boom')));

    component.copyPasswordResetLink(user({ id: 'u1', email: 'user@example.com' }));

    expect(error).toHaveBeenCalledWith("Password reset link for 'user@example.com' can not be created.");
  });

  it('offers Disable / Enable on every user but yourself', () => {
    const { component } = setup();

    expect(component.canChangeStatus(user({ id: 'u1' }))).toBe(true);
    expect(component.canChangeStatus(user({ id: 'adm' }))).toBe(false);
  });

  it('shows a role by its label, no role as None', () => {
    const { component } = setup();

    expect(component['roleLabel']('EDITOR')).toBe('Editor');
    expect(component['roleLabel'](undefined)).toBe('None');
  });

  it('names the OAuth logins of the Sign-in column', () => {
    const { component } = setup();

    expect(component['loginLabel']('google')).toBe('Google');
    expect(component['loginLabel']('microsoft')).toBe('Microsoft');
  });
});
