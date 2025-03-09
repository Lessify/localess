import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Space } from '@shared/models/space.model';
import { SpaceService } from '@shared/services/space.service';
import { pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-SPACE-STATE';
const ROOT_PATH: PathItem = { name: 'Root', fullSlug: '' };
const DEFAULT_PATH = [ROOT_PATH];
export type SpaceState = {
  spaces: Space[];
  selectedSpaceId: string | undefined;
  contentPath: PathItem[];
  assetPath: PathItem[];
};

export type PathItem = {
  fullSlug: string;
  name: string;
};

const initialState: SpaceState = {
  spaces: [],
  selectedSpaceId: undefined,
  contentPath: DEFAULT_PATH,
  assetPath: DEFAULT_PATH,
};

const initialStateFactory = (): SpaceState => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) };
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
                patchState(state, { spaces: [], selectedSpaceId: undefined, assetPath: DEFAULT_PATH, contentPath: DEFAULT_PATH });
              } else {
                const selectedSpaceId = state.selectedSpaceId();
                if (selectedSpaceId) {
                  const foundSpace = response.find(space => space.id === selectedSpaceId);
                  if (foundSpace) {
                    patchState(state, { spaces: response, selectedSpaceId: selectedSpaceId });
                  } else {
                    patchState(state, {
                      spaces: response,
                      selectedSpaceId: response[0].id,
                      assetPath: DEFAULT_PATH,
                      contentPath: DEFAULT_PATH,
                    });
                  }
                } else {
                  patchState(state, {
                    spaces: response,
                    selectedSpaceId: response[0].id,
                    assetPath: DEFAULT_PATH,
                    contentPath: DEFAULT_PATH,
                  });
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
        const foundSpace = state.spaces().find(it => it.id === space.id);
        if (foundSpace) {
          patchState(state, { selectedSpaceId: space.id, assetPath: DEFAULT_PATH, contentPath: DEFAULT_PATH });
        } else {
          patchState(state, { selectedSpaceId: state.spaces()[0].id, assetPath: DEFAULT_PATH, contentPath: DEFAULT_PATH });
        }
        localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: space.id }));
      },
      changeContentPath: (contentPath: PathItem[]) => {
        console.log('changeContentPath', contentPath);
        patchState(state, { contentPath });
      },
      changeAssetPath: (assetPath: PathItem[]) => {
        console.log('changeContentPath', assetPath);
        patchState(state, { assetPath });
      },
    };
  }),
  withComputed(state => {
    return {
      spaces: computed(() => state.spaces()),
      contentPath: computed(() => state.contentPath()),
      assetPath: computed(() => state.assetPath()),
      selectedSpace: computed(() => state.spaces().find(space => space.id === state.selectedSpaceId())),
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
