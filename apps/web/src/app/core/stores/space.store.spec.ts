import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IdName, IdNameUrl, Space, UserRole } from '@localess/shared';
import { AssetService } from '@core/services/asset.service';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { SpaceEnvironmentService } from '@core/services/space-environment.service';
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

  /** A space of the sidebar list. */
  function space(id: string): IdName {
    return { id, name: `Space ${id}` };
  }

  /** The selected space as `GET /spaces/:id` answers it: with its default locale and its locales. */
  function detail(id: string, localeIds: string[] = ['en']): Space {
    return {
      id,
      name: `Space ${id}`,
      defaultLocaleId: localeIds[0],
      defaultLocale: { id: localeIds[0], name: localeIds[0].toUpperCase() },
      spaceLocales: localeIds.map((localeId, position) => ({
        spaceId: id,
        localeId,
        position,
        createdAt: '',
        locale: { id: localeId, name: localeId.toUpperCase() },
      })),
      createdAt: '',
      updatedAt: '',
    };
  }

  function env(id: string, name: string, url: string): IdNameUrl {
    return { id, name, url };
  }

  type Listeners = {
    /** The selected space's environments, by space id. */
    environments?: Record<string, IdNameUrl[]>;
    findOne?: (spaceId: string) => Observable<Space>;
    /** The content folders and documents (`GET …/contents/folders`, `…/documents`). */
    findAllFolders?: (spaceId: string) => Observable<unknown>;
    findAllDocuments?: (spaceId: string) => Observable<unknown>;
    /** The asset folders and files (`GET …/assets/folders`, `…/files`). */
    findAllAssetFolders?: (spaceId: string) => Observable<unknown>;
    findAllAssetFiles?: (spaceId: string) => Observable<unknown>;
    findAllSchemas?: (spaceId: string) => Observable<unknown>;
    notifyError?: ReturnType<typeof vi.fn>;
    isAuthenticated?: ReturnType<typeof signal<boolean>>;
    /** The signed-in user; an admin unless a test says otherwise. */
    /** `null`: no role (signed up, no access yet). */
    role?: UserRole | null;
  };

  /** The space data listeners stay silent unless a test hands them something to emit. */
  function configure(findAll: () => Observable<IdName[]>, listeners: Listeners = {}) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SpaceService,
          useValue: {
            findAllNames: findAll,
            findOne: listeners.findOne ?? ((id: string) => of(detail(id))),
          },
        },
        { provide: SpaceEnvironmentService, useValue: { findAllNames: (id: string) => of(listeners.environments?.[id] ?? []) } },
        {
          provide: ContentService,
          useValue: {
            findAllFolders: listeners.findAllFolders ?? (() => NEVER),
            findAllDocuments: listeners.findAllDocuments ?? (() => NEVER),
          },
        },
        {
          provide: AssetService,
          useValue: {
            findAllFolders: listeners.findAllAssetFolders ?? (() => NEVER),
            findAllFiles: listeners.findAllAssetFiles ?? (() => NEVER),
          },
        },
        { provide: SchemaService, useValue: { findAll: listeners.findAllSchemas ?? (() => NEVER) } },
        { provide: NotificationService, useValue: { error: listeners.notifyError ?? vi.fn() } },
        {
          provide: UserStore,
          useValue: {
            isAuthenticated: listeners.isAuthenticated ?? signal(true),
            loaded: signal(true),
            role: signal(listeners.role === undefined ? 'ADMIN' : listeners.role),
          },
        },
      ],
    });
    return TestBed.inject(SpaceStore);
  }

  function createStore(spaces: IdName[], listeners?: Listeners) {
    return configure(() => of(spaces), listeners);
  }

  it('holds every space the server lists, more than one page of them (the server leaves out imports)', () => {
    const spaces = Array.from({ length: 250 }, (_, i) => space(`s${i}`));
    const store = createStore(spaces);
    expect(store.spaces()).toHaveLength(250);
    store.changeSpace(spaces[249]);
    TestBed.tick();
    expect(store.selectedSpace()?.id).toBe('s249');
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
    TestBed.tick();
    expect(store.selectedSpace()?.id).toBe('a');
  });

  it('resolves the first environment by default when a space has environments', () => {
    const store = createStore([space('a')], {
      environments: { a: [env('e1', 'prod', 'https://prod'), env('e2', 'staging', 'https://staging')] },
    });
    TestBed.tick();
    expect(store.environment()?.name).toBe('prod');
  });

  it('re-selects the persisted spaceId when it still exists in the response', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'b', selectedEnvironmentBySpaceId: {} }));
    const store = createStore([space('a'), space('b')]);
    TestBed.tick();
    expect(store.selectedSpace()?.id).toBe('b');
  });

  it('falls back to the first space when the persisted spaceId no longer exists', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'missing', selectedEnvironmentBySpaceId: {} }));
    const findOne = vi.fn((id: string) => of(detail(id)));
    const store = createStore([space('a'), space('b')], { findOne });
    TestBed.tick();
    expect(store.selectedSpace()?.id).toBe('a');
    // The stale id is never requested.
    expect(findOne.mock.calls).toEqual([['a']]);
  });

  it('resolves the persisted environment by id for the selected space, even among equal names', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: { a: 'e2' } }));
    const store = createStore([space('a')], {
      environments: { a: [env('e1', 'preview', 'https://one'), env('e2', 'preview', 'https://two')] },
    });
    TestBed.tick();
    expect(store.environment()?.url).toBe('https://two');
  });

  // Older versions stored the name; it matches no id, so the first environment is used.
  it('falls back to the first environment for a selection stored by name', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: { a: 'staging' } }));
    const store = createStore([space('a')], {
      environments: { a: [env('e1', 'prod', 'https://prod'), env('e2', 'staging', 'https://staging')] },
    });
    TestBed.tick();
    expect(store.environment()?.id).toBe('e1');
  });

  it('spaceById finds a space by id, or returns undefined', () => {
    const store = createStore([space('a'), space('b')]);
    expect(store.spaceById('b')()?.id).toBe('b');
    expect(store.spaceById('missing')()).toBeUndefined();
  });

  it('changeSpace updates the selected space, resets paths, and resolves its environment', () => {
    const store = createStore([space('a'), space('b')], { environments: { b: [env('e1', 'prod', 'https://prod')] } });
    store.changeContentFolder('f1');

    store.changeSpace(space('b'));
    TestBed.tick();

    expect(store.selectedSpace()?.id).toBe('b');
    expect(store.environment()?.name).toBe('prod');
    expect(store.contentFolderId()).toBeNull();
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

      expect(store.contents()).toEqual([{ id: 'doc' }]);
      expect(store.schemas()).toEqual([{ id: 'schema' }]);
      expect(store.schemasLoaded()).toBe(true);
    });

    it('holds every folder and document with its path, and the folders, documents and ids worked out from them', () => {
      const documents = new Subject<unknown>();
      const store = createStore([space('a')], {
        findAllFolders: () =>
          of([
            { id: 'blog', kind: 'FOLDER', name: 'Blog', slug: 'blog' },
            { id: 'y24', kind: 'FOLDER', parentId: 'blog', name: '2024', slug: '2024' },
          ]),
        findAllDocuments: () => documents,
      });
      TestBed.tick();
      // Loaded once both lists arrived.
      expect(store.contentsLoaded()).toBe(false);
      documents.next([
        { id: 'post', kind: 'DOCUMENT', parentId: 'y24', name: 'Post', slug: 'post', updatedAt: '' },
        { id: 'home', kind: 'DOCUMENT', name: 'Home', slug: 'home', updatedAt: '' },
      ]);

      expect(store.contentsLoaded()).toBe(true);
      expect(store.contentFolders().map(it => it.fullSlug)).toEqual(['blog', 'blog/2024']);
      expect(store.contentDocuments().map(it => it.fullSlug)).toEqual(['blog/2024/post', 'home']);
      expect(store.contentById().get('post')?.name).toBe('Post');
    });

    it('never listens to a persisted space that no longer exists (new install, deleted space)', () => {
      localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'missing', selectedEnvironmentBySpaceId: {} }));
      const findAllDocuments = vi.fn().mockReturnValue(of([]));
      const findAllSchemas = vi.fn().mockReturnValue(of([]));
      const notifyError = vi.fn();
      createStore([space('a')], { findAllDocuments, findAllSchemas, notifyError });
      TestBed.tick();

      expect(findAllDocuments.mock.calls).toEqual([['a']]);
      expect(findAllSchemas.mock.calls).toEqual([['a']]);
      expect(notifyError).not.toHaveBeenCalled();
    });

    it('waits for the space list before listening to the persisted space', () => {
      localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: {} }));
      const spaces = new Subject<IdName[]>();
      const findAllDocuments = vi.fn().mockReturnValue(NEVER);
      configure(() => spaces, { findAllDocuments });
      TestBed.tick();

      expect(findAllDocuments).not.toHaveBeenCalled();

      spaces.next([space('a')]);
      TestBed.tick();

      expect(findAllDocuments.mock.calls).toEqual([['a']]);
    });

    it('listens to documents and schemas for every role, a viewer included (as the server)', () => {
      const findAllDocuments = vi.fn(() => of([{ id: 'doc' }]));
      const store = createStore([space('a')], { findAllDocuments, findAllSchemas: () => of([{ id: 'schema' }]), role: 'VIEWER' });
      TestBed.tick();

      expect(findAllDocuments.mock.calls).toEqual([['a']]);
      expect(store.schemas()).toEqual([{ id: 'schema' }]);
    });

    it('listens to nothing for a user without a role (as the server)', () => {
      const findAllDocuments = vi.fn(() => of([{ id: 'doc' }]));
      const findAllSchemas = vi.fn(() => of([{ id: 'schema' }]));
      createStore([space('a')], { findAllDocuments, findAllSchemas, role: null });
      TestBed.tick();

      expect(findAllDocuments).not.toHaveBeenCalled();
      expect(findAllSchemas).not.toHaveBeenCalled();
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
      expect(store.contents()).toEqual([]);
      expect(store.schemas()).toEqual([]);
      // Not loaded yet for the new space: the Schemas page shows its loading bar, not "no schemas".
      expect(store.schemasLoaded()).toBe(false);
    });

    it('keeps the listeners and data when re-selecting the current space', () => {
      const findAllDocuments = vi.fn().mockReturnValue(of([{ id: 'doc' }]));
      const store = createStore([space('a'), space('b')], { findAllDocuments });
      TestBed.tick();

      store.changeSpace(space('a'));
      TestBed.tick();

      expect(findAllDocuments).toHaveBeenCalledTimes(1);
      expect(store.contents()).toEqual([{ id: 'doc' }]);
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
      expect(store.contents()).toEqual([]);
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
      expect(store.contents()).toEqual([]);

      await vi.advanceTimersByTimeAsync(1000);

      expect(store.contents()).toEqual([{ id: 'doc' }]);
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

  describe('asset lists', () => {
    it('holds the asset folders of the selected space, and drops them when the space changes', () => {
      const findAllAssetFolders = vi.fn((spaceId: string) => of([{ id: `f-${spaceId}`, name: 'Images' }]));
      const store = createStore([space('a'), space('b')], { findAllAssetFolders });
      TestBed.tick();
      expect(store.assetFolders()).toEqual([{ id: 'f-a', name: 'Images' }]);

      store.changeSpace(space('b'));
      TestBed.tick();
      expect(store.assetFolders()).toEqual([{ id: 'f-b', name: 'Images' }]);
    });

    it('reads the files only once asked (an Asset field), live, and stops when the space changes', () => {
      const files = new Map<string, Subject<unknown>>();
      const findAllAssetFiles = vi.fn((spaceId: string) => {
        const subject = new Subject<unknown>();
        files.set(spaceId, subject);
        return subject;
      });
      const store = createStore([space('a'), space('b')], { findAllAssetFiles });
      TestBed.tick();
      expect(findAllAssetFiles).not.toHaveBeenCalled();

      store.loadAssetFiles();
      store.loadAssetFiles();
      TestBed.tick();
      expect(findAllAssetFiles.mock.calls).toEqual([['a']]);
      files.get('a')?.next([{ id: 'logo', name: 'logo' }]);
      expect(store.assetFilesLoaded()).toBe(true);
      expect(store.assetFileById().get('logo')?.name).toBe('logo');
      files.get('a')?.next([{ id: 'logo', name: 'brand' }]);
      expect(store.assetFileById().get('logo')?.name).toBe('brand');

      // Another space: the files go until an editor asks again.
      store.changeSpace(space('b'));
      TestBed.tick();
      expect(files.get('a')?.observed).toBe(false);
      expect(store.assetFiles()).toEqual([]);
      expect(findAllAssetFiles).toHaveBeenCalledTimes(1);
    });
  });

  it('changeContentFolder and changeAssetFolder update their respective signals', () => {
    const store = createStore([space('a')]);
    expect(store.contentFolderId()).toBeNull();
    expect(store.assetFolderId()).toBeNull();

    store.changeContentFolder('f1');
    store.changeAssetFolder('a1');

    expect(store.contentFolderId()).toBe('f1');
    expect(store.assetFolderId()).toBe('a1');
  });

  it('keeps the open folders when the live space list reloads with the same space selected', () => {
    const spaces = new Subject<IdName[]>();
    const store = configure(() => spaces);
    spaces.next([space('a'), space('b')]);
    store.changeContentFolder('f1');
    store.changeAssetFolder('a1');

    // Any change to any space (a colleague adds one) re-emits the list.
    spaces.next([space('a'), space('b'), space('c')]);

    expect(store.selectedSpaceId()).toBe('a');
    expect(store.contentFolderId()).toBe('f1');
    expect(store.assetFolderId()).toBe('a1');
  });

  it('changeEnvironment updates the environment and persists the per-space selection', () => {
    const store = createStore([space('a')], {
      environments: { a: [env('e1', 'prod', 'https://prod'), env('e2', 'staging', 'https://staging')] },
    });
    TestBed.tick();

    store.changeEnvironment(env('e2', 'staging', 'https://staging'));

    expect(store.environment()?.name).toBe('staging');
    const persisted = JSON.parse(localStorage.getItem(LS_KEY)!);
    expect(persisted.selectedEnvironmentBySpaceId.a).toBe('e2');
  });

  it('reads the selected space with its locales, in their order, and its default locale', () => {
    const store = createStore([space('a')], { findOne: id => of(detail(id, ['de', 'en', 'fr'])) });
    TestBed.tick();
    expect(store.locales().map(it => it.id)).toEqual(['de', 'en', 'fr']);
    expect(store.defaultLocale()?.id).toBe('de');
  });

  it('drops the previous space, its locales and environments while the next one loads', () => {
    const next = new Subject<Space>();
    const store = createStore([space('a'), space('b')], {
      findOne: id => (id === 'b' ? next : of(detail(id))),
      environments: { a: [env('e1', 'prod', 'https://prod')] },
    });
    TestBed.tick();
    expect(store.selectedSpace()?.id).toBe('a');

    store.changeSpace(space('b'));
    TestBed.tick();

    expect(store.selectedSpace()).toBeUndefined();
    expect(store.locales()).toEqual([]);
    expect(store.environments()).toEqual([]);
    next.next(detail('b'));
    expect(store.selectedSpace()?.id).toBe('b');
  });

  it('keeps the same selected space and environments when a live refetch answers what it had (no re-render)', () => {
    const space$ = new Subject<Space>();
    const environments: Record<string, IdNameUrl[]> = { a: [env('e1', 'prod', 'https://prod')] };
    const store = createStore([space('a')], { findOne: () => space$, environments });
    TestBed.tick();
    space$.next(detail('a'));
    const first = store.selectedSpace();

    space$.next(detail('a'));
    expect(store.selectedSpace()).toBe(first);

    space$.next(detail('a', ['en', 'de']));
    expect(store.selectedSpace()).not.toBe(first);
    expect(store.locales().map(it => it.id)).toEqual(['en', 'de']);
  });
});
