import { computed } from '@angular/core';
import { getState, patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';

const LS_KEY = 'LL-SETTINGS-STATE';

export type Theme = 'light' | 'dark' | 'auto';
export type EditorSize = '' | 'sm' | 'md' | 'lg' | 'xl';
export type DataLayout = 'list' | 'grid';
export type TranslationLayout = 'list' | 'tree';

export interface LocalSettingsState {
  theme: Theme;
  debugEnabled: boolean;
  editorEnabled: boolean;
  editorSize: EditorSize;
  editorFormWidth: number;
  assetLayout: DataLayout;
  assetDialogLayout: DataLayout;
  translationLayout: TranslationLayout;
  lastSeenVersion: string;
}

export const initialState: LocalSettingsState = {
  theme: 'auto',
  debugEnabled: false,
  editorEnabled: false,
  editorSize: '',
  editorFormWidth: 35,
  assetLayout: 'list',
  assetDialogLayout: 'list',
  translationLayout: 'list',
  lastSeenVersion: '',
};

function setDocumentTheme(theme: Theme) {
  switch (theme) {
    case 'light': {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      document.documentElement.setAttribute('data-theme', 'light');
      break;
    }
    case 'dark': {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
      break;
    }
  }
}

const initialStateFactory = (): LocalSettingsState => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) };
  }
  return { ...initialState };
};

export const LocalSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<LocalSettingsState>(initialStateFactory),
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
      setEditorEnabled: (editorEnabled: boolean): void => {
        patchState(store, { editorEnabled });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), editorEnabled }));
      },
      setEditorSize: (editorSize: EditorSize): void => {
        patchState(store, { editorSize });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), editorSize }));
      },
      setEditorFormWidth: (editorFormWidth: number): void => {
        patchState(store, { editorFormWidth });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), editorFormWidth }));
      },
      setAssetLayout: (assetLayout: DataLayout): void => {
        patchState(store, { assetLayout });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), assetLayout }));
      },
      setAssetDialogLayout: (assetDialogLayout: DataLayout): void => {
        patchState(store, { assetDialogLayout });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), assetDialogLayout }));
      },
      setTranslationLayout: (translationLayout: TranslationLayout): void => {
        patchState(store, { translationLayout });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), translationLayout }));
      },
      setLastSeenVersion: (lastSeenVersion: string): void => {
        patchState(store, { lastSeenVersion });
        localStorage.setItem(LS_KEY, JSON.stringify({ ...getState(store), lastSeenVersion }));
      },
    };
  }),
  withComputed(store => {
    return {
      theme: computed(() => store.theme()),
      debugEnabled: computed(() => store.debugEnabled()),
      editorEnabled: computed(() => store.editorEnabled()),
      editorSize: computed(() => store.editorSize()),
      editorFormWidth: computed(() => store.editorFormWidth()),
      assetLayout: computed(() => store.assetLayout()),
      assetDialogLayout: computed(() => store.assetDialogLayout()),
      translationLayout: computed(() => store.translationLayout()),
      lastSeenVersion: computed(() => store.lastSeenVersion()),
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
  }),
);
