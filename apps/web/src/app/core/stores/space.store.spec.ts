import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Space, SpaceEnvironment } from '@localess/shared';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { SpaceService } from '@core/services/space.service';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SpaceStore } from './space.store';
import { UserStore } from './user.store';

describe('SpaceStore', () => {
  const LS_KEY = 'LL-SPACE-STATE';

  beforeEach(() => {
    localStorage.clear();
  });

  function space(id: string, environments: SpaceEnvironment[] = []): Space {
    return {
      id,
      name: `Space ${id}`,
      locales: [],
      defaultLocale: { id: 'en', name: 'English' } as Space['defaultLocale'],
      environments,
      createdAt: 0 as unknown as Space['createdAt'],
      updatedAt: 0 as unknown as Space['updatedAt'],
    };
  }

  type Listeners = {
    findAllDocuments?: (spaceId: string) => Observable<unknown>;
    findAllSchemas?: (spaceId: string) => Observable<unknown>;
    notifyError?: ReturnType<typeof vi.fn>;
    isAuthenticated?: ReturnType<typeof signal<boolean>>;
  };

  /** The space data listeners stay silent unless a test hands them something to emit. */
  function configure(findAll: () => Observable<Space[]>, listeners: Listeners = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { findAll } },
        { provide: ContentService, useValue: { findAllDocuments: listeners.findAllDocuments ?? (() => NEVER) } },
        { provide: SchemaService, useValue: { findAll: listeners.findAllSchemas ?? (() => NEVER) } },
        { provide: NotificationService, useValue: { error: listeners.notifyError ?? vi.fn() } },
        { provide: UserStore, useValue: { isAuthenticated: listeners.isAuthenticated ?? signal(true) } },
      ],
    });
    return TestBed.inject(SpaceStore);
  }

  function createStore(spaces: Space[], listeners?: Listeners) {
    return configure(() => of(spaces), listeners);
  }

  it('leaves out spaces that are being imported or whose import failed: they cannot be opened', () => {
    const store = createStore([{ ...space('importing'), importStatus: 'IMPORTING' }, { ...space('failed'), importStatus: 'FAILED' }, space('ready')]);
    expect(store.spaces().map(it => it.id)).toEqual(['ready']);
    expect(store.selectedSpace()?.id).toBe('ready');
  });

  it('selects no space and clears paths when the response is empty', () => {
    const store = createStore([]);
    expect(store.spaces()).toEqual([]);
    expect(store.selectedSpace()).toBeUndefined();
    expect(store.environment()).toBeUndefined();
  });

  it('reports hasNoSpaces once an empty response has arrived', () => {
    const store = createStore([]);
    expect(store.hasNoSpaces()).toBe(true);
  });

  it('does not report hasNoSpaces for an account that has spaces', () => {
    const store = createStore([space('a')]);
    expect(store.hasNoSpaces()).toBe(false);
  });

  it('does not report hasNoSpaces before the first load resolves', () => {
    // `spaces` starts empty, so without the `loaded` gate this would be true on every login and
    // flash an onboarding prompt at users who have plenty of spaces.
    const store = configure(() => NEVER);

    expect(store.spaces()).toEqual([]);
    expect(store.hasNoSpaces()).toBe(false);
  });

  it('reports hasNoSpaces when the load fails, rather than waiting forever', () => {
    const store = configure(() => throwError(() => new Error('boom')));

    expect(store.hasNoSpaces()).toBe(true);
  });

  it('selects the first space by default when nothing is persisted', () => {
    const spaceA = space('a');
    const spaceB = space('b');
    const store = createStore([spaceA, spaceB]);
    expect(store.selectedSpace()?.id).toBe('a');
  });

  it('resolves the first environment by default when a space has environments', () => {
    const spaceA = space('a', [
      { id: 'e1', name: 'prod', url: 'https://prod' },
      { id: 'e2', name: 'staging', url: 'https://staging' },
    ]);
    const store = createStore([spaceA]);
    expect(store.environment()?.name).toBe('prod');
  });

  it('re-selects the persisted spaceId when it still exists in the response', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'b', selectedEnvironmentBySpaceId: {} }));
    const store = createStore([space('a'), space('b')]);
    expect(store.selectedSpace()?.id).toBe('b');
  });

  it('falls back to the first space when the persisted spaceId no longer exists', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'missing', selectedEnvironmentBySpaceId: {} }));
    const store = createStore([space('a'), space('b')]);
    expect(store.selectedSpace()?.id).toBe('a');
  });

  it('resolves the persisted environment by id for the selected space, even among equal names', () => {
    const spaceA = space('a', [
      { id: 'e1', name: 'preview', url: 'https://one' },
      { id: 'e2', name: 'preview', url: 'https://two' },
    ]);
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: { a: 'e2' } }));
    const store = createStore([spaceA]);
    expect(store.environment()?.url).toBe('https://two');
  });

  // Older versions stored the name; it matches no id, so the first environment is used.
  it('falls back to the first environment for a selection stored by name', () => {
    const spaceA = space('a', [
      { id: 'e1', name: 'prod', url: 'https://prod' },
      { id: 'e2', name: 'staging', url: 'https://staging' },
    ]);
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: { a: 'staging' } }));
    const store = createStore([spaceA]);
    expect(store.environment()?.id).toBe('e1');
  });

  it('spaceById finds a space by id, or returns undefined', () => {
    const store = createStore([space('a'), space('b')]);
    expect(store.spaceById('b')()?.id).toBe('b');
    expect(store.spaceById('missing')()).toBeUndefined();
  });

  it('changeSpace updates the selected space, resets paths, and resolves its environment', () => {
    const spaceA = space('a');
    const spaceB = space('b', [{ id: 'e1', name: 'prod', url: 'https://prod' }]);
    const store = createStore([spaceA, spaceB]);
    store.changeContentPath([{ fullSlug: 'nested', name: 'Nested' }]);

    store.changeSpace(spaceB);

    expect(store.selectedSpace()?.id).toBe('b');
    expect(store.environment()?.name).toBe('prod');
    expect(store.contentPath()).toEqual([{ fullSlug: '', name: 'Root' }]);
  });

  describe('space data listeners', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** One Subject per space, so a test can see which spaces are still being listened to. */
    function subjectsBySpace() {
      const subjects = new Map<string, Subject<unknown>>();
      const listen = (spaceId: string) => {
        const subject = new Subject<unknown>();
        subjects.set(spaceId, subject);
        return subject;
      };
      return { subjects, listen };
    }

    it("loads the selected space's documents and schemas", () => {
      const store = createStore([space('a')], {
        findAllDocuments: () => of([{ id: 'doc' }]),
        findAllSchemas: () => of([{ id: 'schema' }]),
      });
      TestBed.tick();

      expect(store.documents()).toEqual([{ id: 'doc' }]);
      expect(store.schemas()).toEqual([{ id: 'schema' }]);
    });

    it("closes the previous space's listeners and drops its data when the space changes", () => {
      const documents = subjectsBySpace();
      const schemas = subjectsBySpace();
      const store = createStore([space('a'), space('b')], {
        findAllDocuments: documents.listen,
        findAllSchemas: schemas.listen,
      });
      TestBed.tick();
      documents.subjects.get('a')?.next([{ id: 'doc-a' }]);
      schemas.subjects.get('a')?.next([{ id: 'schema-a' }]);

      store.changeSpace(space('b'));
      TestBed.tick();

      expect(documents.subjects.get('a')?.observed).toBe(false);
      expect(schemas.subjects.get('a')?.observed).toBe(false);
      expect(documents.subjects.get('b')?.observed).toBe(true);
      expect(schemas.subjects.get('b')?.observed).toBe(true);
      expect(store.documents()).toEqual([]);
      expect(store.schemas()).toEqual([]);
    });

    it('keeps the listeners and data when re-selecting the current space', () => {
      const findAllDocuments = vi.fn().mockReturnValue(of([{ id: 'doc' }]));
      const store = createStore([space('a'), space('b')], { findAllDocuments });
      TestBed.tick();

      store.changeSpace(space('a'));
      TestBed.tick();

      expect(findAllDocuments).toHaveBeenCalledTimes(1);
      expect(store.documents()).toEqual([{ id: 'doc' }]);
    });

    it('stops listening and drops the data on sign-out', () => {
      const documents = subjectsBySpace();
      const isAuthenticated = signal(true);
      const store = createStore([space('a')], { findAllDocuments: documents.listen, isAuthenticated });
      TestBed.tick();
      documents.subjects.get('a')?.next([{ id: 'doc' }]);

      isAuthenticated.set(false);
      TestBed.tick();

      expect(documents.subjects.get('a')?.observed).toBe(false);
      expect(store.documents()).toEqual([]);
    });

    it('notifies the user and recovers documents after the listener errors once', async () => {
      vi.useFakeTimers();
      let call = 0;
      const findAllDocuments = vi.fn().mockImplementation((): Observable<unknown> => {
        call++;
        return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'doc' }]);
      });
      const notifyError = vi.fn();
      const store = createStore([space('a')], { findAllDocuments, notifyError });
      TestBed.tick();

      expect(notifyError).toHaveBeenCalledWith('Lost connection to content updates. Retrying…');
      expect(store.documents()).toEqual([]);

      await vi.advanceTimersByTimeAsync(1000);

      expect(store.documents()).toEqual([{ id: 'doc' }]);
      expect(findAllDocuments).toHaveBeenCalledTimes(2);
    });

    it('notifies the user and recovers schemas after the listener errors once', async () => {
      vi.useFakeTimers();
      let call = 0;
      const findAllSchemas = vi.fn().mockImplementation((): Observable<unknown> => {
        call++;
        return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'schema' }]);
      });
      const notifyError = vi.fn();
      const store = createStore([space('a')], { findAllSchemas, notifyError });
      TestBed.tick();

      expect(notifyError).toHaveBeenCalledWith('Lost connection to schema updates. Retrying…');
      expect(store.schemas()).toEqual([]);

      await vi.advanceTimersByTimeAsync(1000);

      expect(store.schemas()).toEqual([{ id: 'schema' }]);
      expect(findAllSchemas).toHaveBeenCalledTimes(2);
    });

    it('does not notify or retry when the listeners succeed on the first try', () => {
      const findAllDocuments = vi.fn().mockReturnValue(of([{ id: 'doc' }]));
      const notifyError = vi.fn();
      createStore([space('a')], { findAllDocuments, notifyError });
      TestBed.tick();

      expect(notifyError).not.toHaveBeenCalled();
      expect(findAllDocuments).toHaveBeenCalledTimes(1);
    });
  });

  it('changeContentPath and changeAssetPath update their respective signals', () => {
    const store = createStore([space('a')]);
    const path = [{ fullSlug: 'docs', name: 'Docs' }];

    store.changeContentPath(path);
    store.changeAssetPath(path);

    expect(store.contentPath()).toEqual(path);
    expect(store.assetPath()).toEqual(path);
  });

  it('changeEnvironment updates the environment and persists the per-space selection', () => {
    const spaceA = space('a', [
      { id: 'e1', name: 'prod', url: 'https://prod' },
      { id: 'e2', name: 'staging', url: 'https://staging' },
    ]);
    const store = createStore([spaceA]);

    store.changeEnvironment({ id: 'e2', name: 'staging', url: 'https://staging' });

    expect(store.environment()?.name).toBe('staging');
    const persisted = JSON.parse(localStorage.getItem(LS_KEY)!);
    expect(persisted.selectedEnvironmentBySpaceId.a).toBe('e2');
  });
});
