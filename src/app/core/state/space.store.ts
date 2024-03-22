import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { Space } from '@shared/models/space.model';
import { SpaceService } from '@shared/services/space.service';
import { pipe, switchMap } from 'rxjs';

export type SpaceState = {
  spaces: Space[];
  selectedSpace: Space | undefined;
  contentPath: PathItem[] | undefined;
  assetPath: PathItem[] | undefined;
};

export type PathItem = {
  fullSlug: string;
  name: string;
};

const initialState: SpaceState = {
  spaces: [],
  selectedSpace: undefined,
  contentPath: undefined,
  assetPath: undefined,
};

export const SpaceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(state => {
    const spaceService = inject(SpaceService);
    return {
      load: rxMethod(
        pipe(
          switchMap(() => spaceService.findAll()),
          tapResponse({
            next: response => {
              if (response.length === 0) {
                patchState(state, { spaces: [], selectedSpace: undefined, assetPath: undefined, contentPath: undefined });
              } else {
                const selectedSpace = state.selectedSpace();
                if (selectedSpace) {
                  const found = response.find(space => space.id === selectedSpace.id);
                  if (found) {
                    patchState(state, { spaces: response, selectedSpace: found });
                  } else {
                    patchState(state, { spaces: response, selectedSpace: response[0], assetPath: undefined, contentPath: undefined });
                  }
                } else {
                  patchState(state, { spaces: response, selectedSpace: response[0], assetPath: undefined, contentPath: undefined });
                }
              }
            },
            error: error => {
              console.error('Error loading spaces', error);
            },
          })
        )
      ),
      select: (space: Space) => {
        patchState(state, { selectedSpace: space, assetPath: undefined, contentPath: undefined });
      },
      changeContentPath: (contentPath: PathItem[]) => {
        patchState(state, { contentPath });
      },
      changeAssetPath: (assetPath: PathItem[]) => {
        patchState(state, { assetPath });
      },
    };
  })
);
