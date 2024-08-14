import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { Locale } from './locale.model';

export interface Space {
  id: string;
  name: string;
  // Locales
  locales: Locale[];
  localeFallback: Locale;
  // Environments
  environments?: SpaceEnvironment[];
  // UI
  ui?: SpaceUi;
  // overview
  overview?: SpaceOverview;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  name: string;
  url: string;
}

export interface SpaceUi {
  text?: string;
  color?: SpaceUiColor;
}

export type SpaceUiColor = 'primary' | 'secondary' | 'tertiary' | 'error';

export interface SpaceCreate {
  name: string;
}

export interface SpaceCreateFS {
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface SpaceUpdate {
  name: string;
}

export interface SpaceUiUpdate {
  text?: string;
  color?: SpaceUiColor;
}

export interface SpaceOverview {
  translationsCount: number;
  translationSize: number;
  assetsCount: number;
  assetsSize: number;
  contentsCount: number;
  contentSize: number;
  schemasCount: number;
  updatedAt: Timestamp;
}
