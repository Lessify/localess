import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { MeService } from '@shared/services/me.service';
import { NotificationService } from '@shared/services/notification.service';
import { UserStore } from '@shared/stores/user.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MeComponent } from './me.component';

describe('MeComponent', () => {
  function setup() {
    const open = vi.fn();
    const updateProfile = vi.fn().mockReturnValue(of(undefined));
    const updateEmail = vi.fn().mockReturnValue(of(undefined));
    const updatePassword = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.overrideComponent(MeComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MeService, useValue: { updateProfile, updateEmail, updatePassword } },
        { provide: UserStore, useValue: { displayName: signal('Alex'), photoURL: signal('https://example.com/a.png') } },
      ],
    });
    const fixture = TestBed.createComponent(MeComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, open, updateProfile, updateEmail, updatePassword, success, error };
  }

  describe('openEditDialog', () => {
    it('opens the dialog with the current profile and updates it on confirm', () => {
      const { component, open, updateProfile, success } = setup();
      open.mockReturnValue({ closed$: of({ displayName: 'New Name' }) });

      component.openEditDialog();

      expect(open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ context: { displayName: 'Alex', photoURL: 'https://example.com/a.png' } }),
      );
      expect(updateProfile).toHaveBeenCalledWith({ displayName: 'New Name' });
      expect(success).toHaveBeenCalledWith('User has been updated.');
    });

    it('does nothing when the dialog is dismissed without a result', () => {
      const { component, open, updateProfile } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.openEditDialog();

      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('notifies an error when the update fails', () => {
      const { component, open, updateProfile, error } = setup();
      updateProfile.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ displayName: 'New Name' }) });

      component.openEditDialog();

      expect(error).toHaveBeenCalledWith('User can not be updated.');
    });
  });

  describe('openUpdateEmailDialog', () => {
    it('updates the email on confirm', () => {
      const { component, open, updateEmail, success } = setup();
      open.mockReturnValue({ closed$: of({ newEmail: 'new@example.com' }) });

      component.openUpdateEmailDialog();

      expect(updateEmail).toHaveBeenCalledWith('new@example.com');
      expect(success).toHaveBeenCalledWith('User email has been updated.');
    });

    it('does nothing when dismissed without a result', () => {
      const { component, open, updateEmail } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.openUpdateEmailDialog();

      expect(updateEmail).not.toHaveBeenCalled();
    });

    it('notifies an error when the update fails', () => {
      const { component, open, updateEmail, error } = setup();
      updateEmail.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ newEmail: 'new@example.com' }) });

      component.openUpdateEmailDialog();

      expect(error).toHaveBeenCalledWith('User email can not be updated.');
    });
  });

  describe('openUpdatePasswordDialog', () => {
    it('updates the password on confirm', () => {
      const { component, open, updatePassword, success } = setup();
      open.mockReturnValue({ closed$: of({ newPassword: 'new-password' }) });

      component.openUpdatePasswordDialog();

      expect(updatePassword).toHaveBeenCalledWith('new-password');
      expect(success).toHaveBeenCalledWith('User password has been updated.');
    });

    it('does nothing when dismissed without a result', () => {
      const { component, open, updatePassword } = setup();
      open.mockReturnValue({ closed$: of(undefined) });

      component.openUpdatePasswordDialog();

      expect(updatePassword).not.toHaveBeenCalled();
    });

    it('notifies an error when the update fails', () => {
      const { component, open, updatePassword, error } = setup();
      updatePassword.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ newPassword: 'new-password' }) });

      component.openUpdatePasswordDialog();

      expect(error).toHaveBeenCalledWith('User password can not be updated.');
    });
  });
});
