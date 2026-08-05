import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@shared/services/notification.service';
import { TranslationService } from '@shared/services/translation.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DangerZoneComponent } from './danger-zone.component';

describe('DangerZoneComponent', () => {
  function setup() {
    const deleteAll = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(DangerZoneComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: { deleteAll } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: SpaceStore, useValue: { selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(DangerZoneComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, deleteAll, success, error, open };
  }

  it('deletes all translations and notifies success when confirmed', () => {
    const { component, open, deleteAll, success } = setup();
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.deleteTranslations('space-1');

    expect(deleteAll).toHaveBeenCalledWith('space-1');
    expect(success).toHaveBeenCalledWith('All Translations deleted process, have successfully started');
  });

  it('does nothing when cancelled', () => {
    const { component, open, deleteAll } = setup();
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.deleteTranslations('space-1');

    expect(deleteAll).not.toHaveBeenCalled();
  });

  it('notifies an error on failure', () => {
    const { component, open, deleteAll, error } = setup();
    deleteAll.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.deleteTranslations('space-1');

    expect(error).toHaveBeenCalledWith('Failed to delete All Translations');
  });
});
