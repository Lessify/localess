import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceEnvironmentService } from '@core/services/space-environment.service';
import { ANY_ROLE, ContentDocument, hasRole, IdName, IdNameUrl, Locale, Schema, Space } from '@localess/shared';
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
  /** Every space the user can open, by name: the sidebar's list (`GET /spaces/names`). */
  spaces: IdName[];
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
  environment: IdNameUrl | undefined;
  /** The selected space with its default locale and its locales (`GET /spaces/:spaceId`), once it arrived. */
  currentSpace: Space | undefined;
  /** The selected space's environments, every one in its order, with its URL (`GET /spaces/:spaceId/environments/names`). */
  environments: IdNameUrl[];
  schemas: Schema[];
  /** Whether `schemas` arrived for the selected space (an empty list is then "no schemas", not "loading"). */
  schemasLoaded: boolean;
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
  currentSpace: undefined,
  environments: [],
  schemas: [],
  schemasLoaded: false,
  documents: [],
};

/** The remembered environment of the space (by id: names may repeat), else its first; none when it has none. */
const resolveEnvironment = (
  spaceId: string,
  environments: IdNameUrl[],
  selectedEnvironmentBySpaceId: Record<string, string>,
): IdNameUrl | undefined => {
  const selectedEnvironmentId = selectedEnvironmentBySpaceId[spaceId];
  return environments.find(environment => environment.id === selectedEnvironmentId) ?? environments[0];
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

/**
 * Whether a live refetch answered what the store already holds: then it keeps the object it has, so nothing bound to
 * it re-renders (a re-rendered row closes the menu a user has open on it).
 */
const sameContent = <T>(previous: T, next: T): boolean => JSON.stringify(previous) === JSON.stringify(next);

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
    const spaceEnvironmentService = inject(SpaceEnvironmentService);
    const contentService = inject(ContentService);
    const schemaService = inject(SchemaService);
    const notificationService = inject(NotificationService);
    const userStore = inject(UserStore);
    // The server's rule for the two lists (`ANY_ROLE`): without a role every request is a 403, retried forever with a
    // "Lost connection" toast.
    const canRead = (): boolean => hasRole({ role: userStore.role() }, ANY_ROLE);

    const listen = <T>(query: () => Observable<T>, logMessage: string, notification: string): Observable<T> =>
      defer(query).pipe(retryWithBackoff<T>(notificationService, logMessage, notification));

    return {
      /**
       * Keeps `schemas` and `documents` on the given space. switchMap closes the previous space's
       * listeners, and the data is dropped first so nothing renders the new space against the old
       * one's. `undefined` (no space, or signed out) stops listening altogether.
       */
      /**
       * Keeps the selected space, its environments, `schemas` and `documents` on the given space. switchMap closes the
       * previous space's listeners, and its data is dropped first so nothing renders the new space against the old
       * one's. `undefined` (no space, or signed out) stops listening altogether.
       */
      _syncSpaceData: rxMethod<string | undefined>(
        pipe(
          distinctUntilChanged(),
          tap(() =>
            patchState(state, {
              currentSpace: undefined,
              environments: [],
              environment: undefined,
              schemas: [],
              schemasLoaded: false,
              documents: [],
            }),
          ),
          switchMap(spaceId =>
            spaceId
              ? merge(
                  listen(
                    () => spaceService.findOne(spaceId),
                    'findById listener failed',
                    'Lost connection to space updates. Retrying…',
                  ).pipe(
                    distinctUntilChanged(sameContent),
                    map(currentSpace => ({ currentSpace })),
                  ),
                  listen(
                    () => spaceEnvironmentService.findAllNames(spaceId),
                    'spaceEnvironmentService.findAllNames listener failed',
                    'Lost connection to space updates. Retrying…',
                  ).pipe(
                    distinctUntilChanged(sameContent),
                    map(environments => ({
                      environments,
                      environment: resolveEnvironment(spaceId, environments, state.selectedEnvironmentBySpaceId()),
                    })),
                  ),
                  canRead()
                    ? listen(
                        () => contentService.findAllDocuments(spaceId),
                        'findAllDocuments listener failed',
                        'Lost connection to content updates. Retrying…',
                      ).pipe(map(documents => ({ documents })))
                    : EMPTY,
                  canRead()
                    ? listen(
                        () => schemaService.findAll(spaceId),
                        'schemaService.findAll listener failed',
                        'Lost connection to schema updates. Retrying…',
                      ).pipe(map(schemas => ({ schemas, schemasLoaded: true })))
                    : EMPTY,
                )
              : EMPTY,
          ),
          tap(patch => patchState(state, patch)),
        ),
      ),
      load: rxMethod<void>(
        pipe(
          // The server leaves out a space being imported from Firebase, or whose import failed: it cannot be opened
          // (Admin → Spaces shows it).
          switchMap(() => spaceService.findAllNames()),
          tapResponse({
            next: spaces => {
              const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
              const selectedSpaceId = state.selectedSpaceId();
              // The list is live: it reloads whenever any space changes. The same space stays selected with its open
              // content and asset folders; a space no longer listed (deleted, new install) falls back to the first.
              const stillListed = spaces.some(space => space.id === selectedSpaceId);
              const nextSpaceId = stillListed ? selectedSpaceId : spaces[0]?.id;
              patchState(
                state,
                stillListed
                  ? { spaces, loaded: true }
                  : { spaces, loaded: true, selectedSpaceId: nextSpaceId, assetFolderId: null, contentFolderId: null },
              );
              persistSpaceState(nextSpaceId, selectedEnvironmentBySpaceId);
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
      changeSpace: (space: IdName) => {
        const selectedEnvironmentBySpaceId = state.selectedEnvironmentBySpaceId();
        const spaceId = state.spaces().some(it => it.id === space.id) ? space.id : state.spaces()[0]?.id;
        patchState(state, { selectedSpaceId: spaceId, assetFolderId: null, contentFolderId: null });
        persistSpaceState(spaceId, selectedEnvironmentBySpaceId);
      },
      changeContentFolder: (contentFolderId: string | null) => {
        patchState(state, { contentFolderId });
      },
      changeAssetFolder: (assetFolderId: string | null) => {
        patchState(state, { assetFolderId });
      },
      changeEnvironment: (environment: IdNameUrl) => {
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
    /** The selected space (with its locales) once it arrived, and only while it is the selected one. */
    const selectedSpace = computed((): Space | undefined => {
      const space = state.currentSpace();
      return space && space.id === state.selectedSpaceId() ? space : undefined;
    });
    return {
      spaces: computed(() => state.spaces()),
      contentFolderId: computed(() => state.contentFolderId()),
      assetFolderId: computed(() => state.assetFolderId()),
      environment: computed(() => state.environment()),
      selectedSpace,
      /** The selected space's locales, in its order: the one place the web reads them from `spaceLocales`. */
      locales: computed((): Locale[] => (selectedSpace()?.spaceLocales ?? []).flatMap(it => (it.locale ? [it.locale] : []))),
      defaultLocale: computed((): Locale | undefined => selectedSpace()?.defaultLocale),
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
      store._syncSpaceData(
        computed(() => {
          const spaceId = store.selectedSpaceId();
          const listed = spaceId !== undefined && store.spaces().some(space => space.id === spaceId);
          return userStore.loaded() && userStore.isAuthenticated() && listed ? spaceId : undefined;
        }),
      );
    },
    onDestroy: store => {
      console.log('onDestroy', store);
    },
  }),
);
