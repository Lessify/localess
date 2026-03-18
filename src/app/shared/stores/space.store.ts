import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ContentDocument } from '@shared/models/content.model';
import { Schema } from '@shared/models/schema.model';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { SpaceService } from '@shared/services/space.service';
import { pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-SPACE-STATE';
const ROOT_PATH: PathItem = { name: 'Root', fullSlug: '' };
const DEFAULT_PATH = [ROOT_PATH];
export type SpaceState = {
  spaces: Space[];
  selectedSpaceId: string | undefined;
  selectedEnvironmentBySpaceId: Record<string, string>;
  contentPath: PathItem[];
  assetPath: PathItem[];
  environment: SpaceEnvironment | undefined;
  schemas: Schema[];
  documents: ContentDocument[];
};

export type PathItem = {
  fullSlug: string;
  name: string;
};

const initialState: SpaceState = {
  spaces: [],
  selectedSpaceId: undefined,
  selectedEnvironmentBySpaceId: {},
  contentPath: DEFAULT_PATH,
  assetPath: DEFAULT_PATH,
  environment: undefined,
  schemas: [],
  documents: [],
};

const resolveEnvironmentForSpace = (
  space: Space | undefined,
  selectedEnvironmentBySpaceId: Record<string, string>,
): SpaceEnvironment | undefined => {
  if (!space) {
    return undefined;
  }
  const environments = space.environments ?? [];
  if (environments.length === 0) {
    return undefined;
  }
  const selectedEnvironmentName = selectedEnvironmentBySpaceId[space.id];
  if (selectedEnvironmentName) {
    const foundEnvironment = environments.find(environment => environment.name === selectedEnvironmentName);
    if (foundEnvironment) {
      return foundEnvironment;
    }
  }
  return environments[0];
};

const persistSpaceState = (selectedSpaceId: string | undefined, selectedEnvironmentBySpaceId: Record<string, string>): void => {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      selectedSpaceId,
      selectedEnvironmentBySpaceId,
    }),
  );
};

const initialStateFactory = (): SpaceState => {
  const stateString = localStorage.getItem(LS_KEY);
  if (stateString) {
    const parsedState = JSON.parse(stateString) as Partial<SpaceState>;
    return {
      ...initialState,
      ...parsedState,
      selectedEnvironmentBySpaceId: parsedState.selectedEnvironmentBySpaceId ?? {},
    };
  }
  return { ...initialState };
};

export const SpaceStore = signalStore(
  { providedIn: 'root' },
  withState<SpaceState>(initialStateFactory),
  withMethods(state => {
    const spaceService = inject(SpaceService);
    return {
      load: rxMethod<void>(
        pipe(
          switchMap(() => spaceService.findAll()),
          tapResponse({
            next: response => {
              console.log('Loaded spaces', response);
              if (response.length === 0) {
                const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
                patchState(state, {
                  spaces: [],
                  selectedSpaceId: undefined,
                  assetPath: DEFAULT_PATH,
                  contentPath: DEFAULT_PATH,
                  environment: undefined,
                });
                persistSpaceState(undefined, selectedEnvironmentBySpaceId);
              } else {
                const selectedSpaceId = state.selectedSpaceId();
                const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
                if (selectedSpaceId) {
                  const foundSpace = response.find(space => space.id === selectedSpaceId);
                  if (foundSpace) {
                    const environment = resolveEnvironmentForSpace(foundSpace, selectedEnvironmentBySpaceId);
                    patchState(state, {
                      spaces: response,
                      selectedSpaceId: selectedSpaceId,
                      assetPath: DEFAULT_PATH,
                      contentPath: DEFAULT_PATH,
                      environment,
                    });
                    persistSpaceState(selectedSpaceId, selectedEnvironmentBySpaceId);
                  } else {
                    const space = response[0];
                    const environment = resolveEnvironmentForSpace(space, selectedEnvironmentBySpaceId);
                    patchState(state, {
                      spaces: response,
                      selectedSpaceId: space.id,
                      assetPath: DEFAULT_PATH,
                      contentPath: DEFAULT_PATH,
                      environment,
                    });
                    persistSpaceState(space.id, selectedEnvironmentBySpaceId);
                  }
                } else {
                  const defaultSpace = response[0];
                  const environment = resolveEnvironmentForSpace(defaultSpace, selectedEnvironmentBySpaceId);
                  patchState(state, {
                    spaces: response,
                    selectedSpaceId: defaultSpace.id,
                    assetPath: DEFAULT_PATH,
                    contentPath: DEFAULT_PATH,
                    environment,
                  });
                  persistSpaceState(defaultSpace.id, selectedEnvironmentBySpaceId);
                }
              }
            },
            error: error => {
              console.error('Error loading spaces', error);
            },
          }),
        ),
      ),
      spaceById: (id: string) => computed(() => state.spaces().find(space => space.id === id)),
      changeSpace: (space: Space) => {
        console.log('changeSpace', space);
        const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
        const foundSpace = state.spaces().find(it => it.id === space.id);
        if (foundSpace) {
          const environment = resolveEnvironmentForSpace(foundSpace, selectedEnvironmentBySpaceId);
          patchState(state, {
            selectedSpaceId: space.id,
            assetPath: DEFAULT_PATH,
            contentPath: DEFAULT_PATH,
            environment,
          });
          persistSpaceState(space.id, selectedEnvironmentBySpaceId);
        } else {
          const fallbackSpace = state.spaces()[0];
          const environment = resolveEnvironmentForSpace(fallbackSpace, selectedEnvironmentBySpaceId);
          patchState(state, {
            selectedSpaceId: fallbackSpace?.id,
            assetPath: DEFAULT_PATH,
            contentPath: DEFAULT_PATH,
            environment,
          });
          persistSpaceState(fallbackSpace?.id, selectedEnvironmentBySpaceId);
        }
      },
      changeContentPath: (contentPath: PathItem[]) => {
        console.log('changeContentPath', contentPath);
        patchState(state, { contentPath });
      },
      changeAssetPath: (assetPath: PathItem[]) => {
        console.log('changeContentPath', assetPath);
        patchState(state, { assetPath });
      },
      changeEnvironment: (environment: SpaceEnvironment) => {
        console.log('changeEnvironment', environment);
        const selectedSpaceId = state.selectedSpaceId();
        if (!selectedSpaceId) {
          patchState(state, { environment });
          return;
        }
        const selectedEnvironmentBySpaceId = {
          ...state.selectedEnvironmentBySpaceId(),
          [selectedSpaceId]: environment.name,
        };
        patchState(state, {
          environment,
          selectedEnvironmentBySpaceId,
        });
        persistSpaceState(selectedSpaceId, selectedEnvironmentBySpaceId);
      },
      updateSchemas: (schemas: Schema[]) => {
        console.log('updateSchemas', schemas);
        patchState(state, { schemas });
      },
      updateDocuments: (documents: ContentDocument[]) => {
        console.log('updateDocuments', documents);
        patchState(state, { documents });
      },
    };
  }),
  withComputed(state => {
    return {
      spaces: computed(() => state.spaces()),
      contentPath: computed(() => state.contentPath()),
      assetPath: computed(() => state.assetPath()),
      environment: computed(() => state.environment()),
      selectedSpace: computed(() => state.spaces().find(space => space.id === state.selectedSpaceId())),
      documents: computed(() => state.documents()),
    };
  }),
  withHooks({
    onInit: store => {
      store.load();
    },
    onDestroy: store => {
      console.log('onDestroy', store);
    },
  }),
);
