import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { VersionService } from '@shared/services/version.service';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import { of, Observable, throwError } from 'rxjs';
import { vi } from 'vitest';

import { FeaturesComponent } from './features.component';

function configureModule(overrides: {
  findAllDocuments: ReturnType<typeof vi.fn>;
  findAllSchemas: ReturnType<typeof vi.fn>;
  updateDocuments: ReturnType<typeof vi.fn>;
  updateSchemas: ReturnType<typeof vi.fn>;
  notifyError: ReturnType<typeof vi.fn>;
}) {
  TestBed.overrideComponent(FeaturesComponent, { set: { template: '<div></div>' } });
  TestBed.configureTestingModule({
    providers: [
      { provide: ContentService, useValue: { findAllDocuments: overrides.findAllDocuments } },
      { provide: SchemaService, useValue: { findAll: overrides.findAllSchemas } },
      { provide: NotificationService, useValue: { error: overrides.notifyError } },
      { provide: ReposService, useValue: { reposGetLatestRelease: vi.fn().mockReturnValue(of({} as Release)) } },
      { provide: VersionService, useValue: {} },
      { provide: Auth, useValue: {} },
      { provide: Router, useValue: { events: of(), navigate: vi.fn() } },
      { provide: ActivatedRoute, useValue: { root: { snapshot: { data: {} }, children: [] } } },
      {
        provide: SpaceStore,
        useValue: {
          selectedSpaceId: signal('space-1'),
          updateDocuments: overrides.updateDocuments,
          updateSchemas: overrides.updateSchemas,
        },
      },
      { provide: UserStore, useValue: { isAuthenticated: signal(true) } },
      { provide: AppSettingsStore, useValue: {} },
      { provide: LocalSettingsStore, useValue: { settings: signal({}) } },
    ],
  });
  return TestBed.createComponent(FeaturesComponent);
}

describe('FeaturesComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies the user and recovers documents after the listener errors once', async () => {
    vi.useFakeTimers();
    let call = 0;
    const findAllDocuments = vi.fn().mockImplementation((): Observable<unknown> => {
      call++;
      return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'doc1' }]);
    });
    const updateDocuments = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments,
      findAllSchemas: vi.fn().mockReturnValue(of([])),
      updateDocuments,
      updateSchemas: vi.fn(),
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).toHaveBeenCalledWith('Lost connection to content updates. Retrying…');
    expect(updateDocuments).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(updateDocuments).toHaveBeenCalledWith([{ id: 'doc1' }]);
    expect(findAllDocuments).toHaveBeenCalledTimes(2);
  });

  it('notifies the user and recovers schemas after the listener errors once', async () => {
    vi.useFakeTimers();
    let call = 0;
    const findAllSchemas = vi.fn().mockImplementation((): Observable<unknown> => {
      call++;
      return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'schema1' }]);
    });
    const updateSchemas = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments: vi.fn().mockReturnValue(of([])),
      findAllSchemas,
      updateDocuments: vi.fn(),
      updateSchemas,
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).toHaveBeenCalledWith('Lost connection to schema updates. Retrying…');
    expect(updateSchemas).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(updateSchemas).toHaveBeenCalledWith([{ id: 'schema1' }]);
    expect(findAllSchemas).toHaveBeenCalledTimes(2);
  });

  it('does not notify or retry when the listeners succeed on the first try', () => {
    const findAllDocuments = vi.fn().mockReturnValue(of([{ id: 'doc1' }]));
    const updateDocuments = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments,
      findAllSchemas: vi.fn().mockReturnValue(of([])),
      updateDocuments,
      updateSchemas: vi.fn(),
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).not.toHaveBeenCalled();
    expect(updateDocuments).toHaveBeenCalledWith([{ id: 'doc1' }]);
    expect(findAllDocuments).toHaveBeenCalledTimes(1);
  });

});
