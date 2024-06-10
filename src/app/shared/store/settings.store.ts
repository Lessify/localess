import { getState, patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { computed } from '@angular/core';

const LS_KEY = 'LL-SETTINGS-STATE';

export type Theme = 'light' | 'dark' | 'auto';

export interface SettingsState {
  theme: Theme;
  mainMenuExpended: boolean;
  debugEnabled: boolean;
  editorEnabled: boolean;
}

export const initialState: SettingsState = {
  theme: 'auto',
  mainMenuExpended: true,
  debugEnabled: false,
  editorEnabled: false,
};

function setDocumentTheme(theme: Theme) {
  switch (theme) {
    case 'light': {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      break;
    }
    case 'dark': {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      break;
    }
  }
}

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
  withMethods(store => {
    return {
      load: () => {
        if (store.theme() === 'auto') {
          const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
          const theme = darkThemeMq.matches ? 'dark' : 'light';
          setDocumentTheme(theme);
          patchState(store, { theme });
        } else {
          setDocumentTheme(store.theme());
        }
      },
      setTheme: (theme: Theme) => {
        patchState(store, { theme });
        setDocumentTheme(store.theme());
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store) }));
      },
      setDebug: (debugEnabled: boolean): void => {
        patchState(store, { debugEnabled });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), debugEnabled }));
      },
      setMainMenuExpended: (mainMenuExpended: boolean): void => {
        patchState(store, { mainMenuExpended });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), mainMenuExpended }));
      },
      setEditorEnabled: (editorEnabled: boolean): void => {
        patchState(store, { editorEnabled });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), editorEnabled }));
      },
    };
  }),
  withComputed(store => {
    return {
      theme: computed(() => store.theme()),
      debugEnabled: computed(() => store.debugEnabled()),
      mainMenuExpended: computed(() => store.mainMenuExpended()),
      editorEnabled: computed(() => store.editorEnabled()),
    };
  }),
  withHooks({
    onInit: store => {
      console.log('onInit', getState(store));
      store.load();
    },
    onDestroy: store => {
      console.log('onDestroy', getState(store));
    },
  })
);
