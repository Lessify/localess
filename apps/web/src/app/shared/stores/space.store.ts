import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ContentDocument } from '@shared/models/content.model';
import { Schema } from '@shared/models/schema.model';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { SpaceService } from '@shared/services/space.service';
import {
  defer,
  distinctUntilChanged,
  EMPTY,
  map,
  merge,
  MonoTypeOperatorFunction,
  Observable,
  pipe,
  retry,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { UserStore } from './user.store';

const LS_KEY = 'LL-SPACE-STATE';
const ROOT_PATH: PathItem = { name: 'Root', fullSlug: '' };
const DEFAULT_PATH = [ROOT_PATH];
export type SpaceState = {
  spaces: Space[];
  /**
   * Whether `load()` has resolved at least once, however it resolved.
   *
   * Without this, an empty `spaces` is ambiguous: it is also the initial state, so "this user has
   * no spaces" and "we have not asked yet" look identical and any onboarding prompt flashes on
   * every login before the response arrives.
   */
  loaded: boolean;
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
  loaded: false,
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

/** Retries re-run the (deferred) query rather than resubscribing to one that already failed. */
const retryWithBackoff = <T>(
  notificationService: NotificationService,
  logMessage: string,
  notification: string,
): MonoTypeOperatorFunction<T> =>
  retry({
    delay: (err, retryCount) => {
      console.error(logMessage, err);
      notificationService.error(notification);
      return timer(Math.min(30000, 1000 * 2 ** (retryCount - 1)));
    },
  });

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
  withProps(store => ({
    /**
     * `loaded` as an observable, created once with the store. Route guards need to wait for the
     * first load, and calling `toObservable` per navigation would leave an effect behind every time.
     */
    loaded$: toObservable(store.loaded),
  })),
  withMethods(state => {
    const spaceService = inject(SpaceService);
    const contentService = inject(ContentService);
    const schemaService = inject(SchemaService);
    const notificationService = inject(NotificationService);

    const listen = <T>(query: () => Observable<T>, logMessage: string, notification: string): Observable<T> =>
      defer(query).pipe(retryWithBackoff<T>(notificationService, logMessage, notification));

    return {
      /**
       * Keeps `schemas` and `documents` on the given space. switchMap closes the previous space's
       * listeners, and the data is dropped first so nothing renders the new space against the old
       * one's. `undefined` (no space, or signed out) stops listening altogether.
       */
      _syncSpaceData: rxMethod<string | undefined>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(state, { schemas: [], documents: [] })),
          switchMap(spaceId =>
            spaceId
              ? merge(
                  listen(
                    () => contentService.findAllDocuments(spaceId),
                    'findAllDocuments listener failed',
                    'Lost connection to content updates. Retrying…',
                  ).pipe(map(documents => ({ documents }))),
                  listen(
                    () => schemaService.findAll(spaceId),
                    'schemaService.findAll listener failed',
                    'Lost connection to schema updates. Retrying…',
                  ).pipe(map(schemas => ({ schemas }))),
                )
              : EMPTY,
          ),
          tap(patch => patchState(state, patch)),
        ),
      ),
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
                  loaded: true,
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
                      loaded: true,
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
                      loaded: true,
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
                    loaded: true,
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
              // Still "loaded": the question was asked and answered, badly. Leaving it false would
              // hang any consumer waiting to know, and `spaces` stays empty either way.
              patchState(state, { loaded: true });
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
      /**
       * This account has no spaces, and we know that for a fact rather than by not having asked.
       *
       * Gated on `loaded` deliberately: `spaces` starts empty, so without it every login would
       * briefly report "no spaces" and flash an onboarding prompt at users who have plenty.
       */
      hasNoSpaces: computed(() => state.loaded() && state.spaces().length === 0),
    };
  }),
  withHooks({
    onInit: store => {
      const userStore = inject(UserStore);
      store.load();
      // Gated on auth: this store outlives the signed-in shell, and listeners left running after
      // sign-out would fail on the rules and retry forever.
      store._syncSpaceData(computed(() => (userStore.isAuthenticated() ? store.selectedSpaceId() : undefined)));
    },
    onDestroy: store => {
      console.log('onDestroy', store);
    },
  }),
);
