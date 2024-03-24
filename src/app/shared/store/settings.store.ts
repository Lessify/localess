import { getState, patchState, signalStore, withMethods, withState } from '@ngrx/signals';

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

const initialStateFactory = () => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) } as SettingsState;
  }
  return { ...initialState } as SettingsState;
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialStateFactory),
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
  })
);
