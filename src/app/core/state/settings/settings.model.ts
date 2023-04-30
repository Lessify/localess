import {AppState} from '../core.state';
import {actionSettingsChangeMainMenuExpended} from '@core/state/settings/settings.actions';

export const NIGHT_MODE_THEME = 'BLACK-THEME';

export type Language = 'en' | 'sk' | 'de' | 'fr' | 'es' | 'pt-br' | 'he';

export interface SettingsState {
  language: string;
  theme: string;
  autoNightMode: boolean;
  nightTheme: string;
  stickyHeader: boolean;
  pageAnimations: boolean;
  pageAnimationsDisabled: boolean;
  elementsAnimations: boolean;
  hour: number;
  mainMenuExpended: boolean
}

export interface State extends AppState {
  settings: SettingsState;
}
