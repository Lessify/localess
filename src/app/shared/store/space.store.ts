import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { Space } from '@shared/models/space.model';
import { SpaceService } from '@shared/services/space.service';
import { pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-SPACE-STATE';
const ROOT_PATH: PathItem = { name: 'Root', fullSlug: '' };

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
  contentPath: [ROOT_PATH],
  assetPath: [ROOT_PATH],
};

const initialStateFactory = () => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) } as SpaceState;
  }
  return { ...initialState } as SpaceState;
};

export const SpaceStore = signalStore(
  { providedIn: 'root' },
  withState(initialStateFactory),
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
                patchState(state, { spaces: [], selectedSpaceId: undefined, assetPath: undefined, contentPath: undefined });
              } else {
                const selectedSpaceId = state.selectedSpaceId();
                if (selectedSpaceId) {
                  const foundSpace = response.find(space => space.id === selectedSpaceId);
                  if (foundSpace) {
                    patchState(state, { spaces: response, selectedSpaceId: selectedSpaceId });
                  } else {
                    patchState(state, { spaces: response, selectedSpaceId: response[0].id, assetPath: undefined, contentPath: undefined });
                  }
                } else {
                  patchState(state, { spaces: response, selectedSpaceId: response[0].id, assetPath: undefined, contentPath: undefined });
                }
              }
            },
            error: error => {
              console.error('Error loading spaces', error);
            },
          })
        )
      ),
      spaceById: (id: string) => computed(() => state.spaces().find(space => space.id === id)),
      changeSpace: (space: Space) => {
        const foundSpace = state.spaces().find(it => it.id === space.id);
        if (foundSpace) {
          patchState(state, { selectedSpaceId: space.id, assetPath: undefined, contentPath: undefined });
        } else {
          patchState(state, { selectedSpaceId: state.spaces()[0].id, assetPath: undefined, contentPath: undefined });
        }
        localStorage.setItem(LS_KEY, JSON.stringify({ selectedSpaceId: space.id }));
      },
      changeContentPath: (contentPath: PathItem[]) => {
        patchState(state, { contentPath });
      },
      changeAssetPath: (assetPath: PathItem[]) => {
        patchState(state, { assetPath });
      },
    };
  }),
  withComputed(state => {
    return {
      // spaces: computed(() => state.spaces()),
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
  })
);
