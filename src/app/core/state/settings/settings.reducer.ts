import { NIGHT_MODE_THEME, SettingsState } from './settings.model';
import {
  actionSettingsChangeAnimationsElements,
  actionSettingsChangeAnimationsPage,
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeAutoNightMode,
  actionSettingsChangeDebugEnabled,
  actionSettingsChangeHour,
  actionSettingsChangeLanguage,
  actionSettingsChangeMainMenuExpended,
  actionSettingsChangeStickyHeader,
  actionSettingsChangeTheme,
} from './settings.actions';
import { Action, createReducer, on } from '@ngrx/store';

export const initialState: SettingsState = {
  language: 'en',
  theme: 'DEFAULT-THEME',
  autoNightMode: false,
  nightTheme: NIGHT_MODE_THEME,
  stickyHeader: true,
  pageAnimations: true,
  pageAnimationsDisabled: false,
  elementsAnimations: true,
  hour: 0,
  mainMenuExpended: true,
  debugEnabled: false,
};

const reducer = createReducer(
  initialState,
  on(
    actionSettingsChangeLanguage,
    actionSettingsChangeTheme,
    actionSettingsChangeAutoNightMode,
    actionSettingsChangeStickyHeader,
    actionSettingsChangeAnimationsPage,
    actionSettingsChangeAnimationsElements,
    actionSettingsChangeHour,
    (state, action) => ({ ...state, ...action })
  ),
  on(actionSettingsChangeMainMenuExpended, state => ({ ...state, mainMenuExpended: !state.mainMenuExpended })),
  on(actionSettingsChangeDebugEnabled, state => ({ ...state, debugEnabled: !state.debugEnabled })),
  on(actionSettingsChangeAnimationsPageDisabled, (state, { pageAnimationsDisabled }) => ({
    ...state,
    pageAnimationsDisabled,
    pageAnimations: false,
  }))
);

export function settingsReducer(state: SettingsState | undefined, action: Action) {
  return reducer(state, action);
}
