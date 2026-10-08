export interface AppSettings {
  // UI
  ui?: AppUi;

  updatedAt: string;
}

export interface AppUi {
  text?: string;
  color?: AppUiColor;
}

export type AppUiColor = 'primary' | 'secondary' | 'outline' | 'destructive';

export interface AppSettingsUiUpdate {
  text?: string;
  color?: AppUiColor;
}
