import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { SpaceService } from '@core/services/space.service';
import { canAny } from '@core/utils/permissions';
import { ContentDocument, Schema, Space, SpaceEnvironment, UserPermission } from '@localess/shared';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
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
  /** The content folder the editor shows; `null`: the root. */
  contentFolderId: string | null;
  /** The asset folder the editor shows; `null`: the root. */
  assetFolderId: string | null;
  environment: SpaceEnvironment | undefined;
  schemas: Schema[];
  documents: ContentDocument[];
};

const initialState: SpaceState = {
  spaces: [],
  loaded: false,
  selectedSpaceId: undefined,
  selectedEnvironmentBySpaceId: {},
  contentFolderId: null,
  assetFolderId: null,
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
  // Remembered by id: names may repeat. A name stored by an older version matches no id and falls back to the first.
  const selectedEnvironmentId = selectedEnvironmentBySpaceId[space.id];
  if (selectedEnvironmentId) {
    const foundEnvironment = environments.find(environment => environment.id === selectedEnvironmentId);
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
    const userStore = inject(UserStore);
    // The server's rule for the two lists (canAny → canPerform): without it every request is a 403, retried forever
    // with a "Lost connection" toast (e.g. for a translator).
    const can = (...permissions: UserPermission[]): boolean => canAny(userStore, ...permissions);

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
                  can(UserPermission.CONTENT_READ)
                    ? listen(
                        () => contentService.findAllDocuments(spaceId),
                        'findAllDocuments listener failed',
                        'Lost connection to content updates. Retrying…',
                      ).pipe(map(documents => ({ documents })))
                    : EMPTY,
                  can(UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)
                    ? listen(
                        () => schemaService.findAll(spaceId),
                        'schemaService.findAll listener failed',
                        'Lost connection to schema updates. Retrying…',
                      ).pipe(map(schemas => ({ schemas })))
                    : EMPTY,
                )
              : EMPTY,
          ),
          tap(patch => patchState(state, patch)),
        ),
      ),
      load: rxMethod<void>(
        pipe(
          // A space being imported from Firebase, or whose import failed, cannot be opened (Admin → Spaces shows it).
          switchMap(() => spaceService.findAll().pipe(map(spaces => spaces.filter(space => !space.importStatus)))),
          tapResponse({
            next: response => {
              console.log('Loaded spaces', response);
              if (response.length === 0) {
                const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
                patchState(state, {
                  spaces: [],
                  loaded: true,
                  selectedSpaceId: undefined,
                  assetFolderId: null,
                  contentFolderId: null,
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
                    // Same space: the open content and asset folders stay. The list is live, so it reloads whenever
                    // any space changes, and resetting here sent everyone back to the root folder mid-work.
                    patchState(state, {
                      spaces: response,
                      loaded: true,
                      selectedSpaceId: selectedSpaceId,
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
                      assetFolderId: null,
                      contentFolderId: null,
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
                    assetFolderId: null,
                    contentFolderId: null,
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
            assetFolderId: null,
            contentFolderId: null,
            environment,
          });
          persistSpaceState(space.id, selectedEnvironmentBySpaceId);
        } else {
          const fallbackSpace = state.spaces()[0];
          const environment = resolveEnvironmentForSpace(fallbackSpace, selectedEnvironmentBySpaceId);
          patchState(state, {
            selectedSpaceId: fallbackSpace?.id,
            assetFolderId: null,
            contentFolderId: null,
            environment,
          });
          persistSpaceState(fallbackSpace?.id, selectedEnvironmentBySpaceId);
        }
      },
      changeContentFolder: (contentFolderId: string | null) => {
        patchState(state, { contentFolderId });
      },
      changeAssetFolder: (assetFolderId: string | null) => {
        patchState(state, { assetFolderId });
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
          [selectedSpaceId]: environment.id,
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
      contentFolderId: computed(() => state.contentFolderId()),
      assetFolderId: computed(() => state.assetFolderId()),
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
      // sign-out would fail on the rules and retry forever. And only a space in the loaded list:
      // the id restored from localStorage may name a space that no longer exists (deleted, new
      // install), which would answer 404 and show "Lost connection" toasts until the list arrives.
      // `loaded` too: `isAuthenticated` comes from localStorage at first, before the role and
      // permissions that decide which lists may be read are known.
      store._syncSpaceData(computed(() => (userStore.loaded() && userStore.isAuthenticated() ? store.selectedSpace()?.id : undefined)));
    },
    onDestroy: store => {
      console.log('onDestroy', store);
    },
  }),
);
