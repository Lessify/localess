import { getState, patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed } from '@angular/core';

const LS_KEY = 'LL-SETTINGS-STATE';

export interface SettingsState {
  mainMenuExpended: boolean;
  debugEnabled: boolean;
  editorEnabled: boolean;
}

export const initialState: SettingsState = {
  mainMenuExpended: true,
  debugEnabled: false,
  editorEnabled: false,
};

const initialStateFactory = (): SettingsState => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) };
  }
  return { ...initialState };
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState<SettingsState>(initialStateFactory),
  withMethods(state => {
    return {
      setDebug: (debugEnabled: boolean): void => {
        patchState(state, { debugEnabled });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(state), debugEnabled }));
      },
      setMainMenuExpended: (mainMenuExpended: boolean): void => {
        patchState(state, { mainMenuExpended });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(state), mainMenuExpended }));
      },
      setEditorEnabled: (editorEnabled: boolean): void => {
        patchState(state, { editorEnabled });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(state), editorEnabled }));
      },
    };
  }),
  withComputed(state => {
    return {
      debugEnabled: computed(() => state.debugEnabled()),
      mainMenuExpended: computed(() => state.mainMenuExpended()),
      editorEnabled: computed(() => state.editorEnabled()),
    };
  })
);
