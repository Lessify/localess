import { TestBed } from '@angular/core/testing';
import { Space } from '@shared/models/space.model';
import { SpaceService } from '@shared/services/space.service';
import { of } from 'rxjs';

import { SpaceStore } from './space.store';

describe('SpaceStore', () => {
  const LS_KEY = 'LL-SPACE-STATE';

  beforeEach(() => {
    localStorage.clear();
  });

  function space(id: string, environments?: { name: string; url: string }[]): Space {
    return {
      id,
      name: `Space ${id}`,
      locales: [],
      localeFallback: { id: 'en', name: 'English' } as Space['localeFallback'],
      environments,
      createdAt: 0 as unknown as Space['createdAt'],
      updatedAt: 0 as unknown as Space['updatedAt'],
    };
  }

  function createStore(spaces: Space[]) {
    TestBed.configureTestingModule({
      providers: [{ provide: SpaceService, useValue: { findAll: () => of(spaces) } }],
    });
    return TestBed.inject(SpaceStore);
  }

  it('selects no space and clears paths when the response is empty', () => {
    const store = createStore([]);
    expect(store.spaces()).toEqual([]);
    expect(store.selectedSpace()).toBeUndefined();
    expect(store.environment()).toBeUndefined();
  });

  it('selects the first space by default when nothing is persisted', () => {
    const spaceA = space('a');
    const spaceB = space('b');
    const store = createStore([spaceA, spaceB]);
    expect(store.selectedSpace()?.id).toBe('a');
  });

  it('resolves the first environment by default when a space has environments', () => {
    const spaceA = space('a', [
      { name: 'prod', url: 'https://prod' },
      { name: 'staging', url: 'https://staging' },
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

  it('resolves the persisted environment for the selected space when it exists', () => {
    const spaceA = space('a', [
      { name: 'prod', url: 'https://prod' },
      { name: 'staging', url: 'https://staging' },
    ]);
    localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: 'a', selectedEnvironmentBySpaceId: { a: 'staging' } }));
    const store = createStore([spaceA]);
    expect(store.environment()?.name).toBe('staging');
  });

  it('spaceById finds a space by id, or returns undefined', () => {
    const store = createStore([space('a'), space('b')]);
    expect(store.spaceById('b')()?.id).toBe('b');
    expect(store.spaceById('missing')()).toBeUndefined();
  });

  it('changeSpace updates the selected space, resets paths, and resolves its environment', () => {
    const spaceA = space('a');
    const spaceB = space('b', [{ name: 'prod', url: 'https://prod' }]);
    const store = createStore([spaceA, spaceB]);
    store.changeContentPath([{ fullSlug: 'nested', name: 'Nested' }]);

    store.changeSpace(spaceB);

    expect(store.selectedSpace()?.id).toBe('b');
    expect(store.environment()?.name).toBe('prod');
    expect(store.contentPath()).toEqual([{ fullSlug: '', name: 'Root' }]);
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
      { name: 'prod', url: 'https://prod' },
      { name: 'staging', url: 'https://staging' },
    ]);
    const store = createStore([spaceA]);

    store.changeEnvironment({ name: 'staging', url: 'https://staging' });

    expect(store.environment()?.name).toBe('staging');
    const persisted = JSON.parse(localStorage.getItem(LS_KEY)!);
    expect(persisted.selectedEnvironmentBySpaceId.a).toBe('staging');
  });

  it('updateSchemas and updateDocuments replace their respective signals', () => {
    const store = createStore([space('a')]);
    const schemas = [{ id: 'schema-1' }] as any;
    const documents = [{ id: 'doc-1' }] as any;

    store.updateSchemas(schemas);
    store.updateDocuments(documents);

    expect(store.documents()).toEqual(documents);
  });
});
