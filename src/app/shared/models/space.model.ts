import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { Locale } from './locale.model';

export interface Space {
  id: string;
  name: string;
  icon?: string;
  // Locales
  locales: Locale[];
  localeFallback: Locale;
  // Environments
  environments?: SpaceEnvironment[];
  // overview
  overview?: SpaceOverview;
  progress?: ProgressOverview;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  name: string;
  url: string;
}

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
  icon?: string;
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

export interface ProgressOverview {
  translations: Record<string, number>;
}
