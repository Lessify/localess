import { Timestamp } from '@angular/fire/firestore';

export interface AppSettings {
  // UI
  ui?: AppUi;

  updatedAt: Timestamp;
}

export interface AppUi {
  text?: string;
  color?: AppUiColor;
}

export type AppUiColor = 'primary' | 'secondary' | 'tertiary' | 'error';

export interface AppSettingsUiUpdate {
  text?: string;
  color?: AppUiColor;
}
