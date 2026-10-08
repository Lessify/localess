import { Locale } from './locale.model';

export interface Space {
  id: string;
  name: string;
  // Locales
  locales: Locale[];
  localeFallback: Locale;
  // Environments
  environments?: SpaceEnvironment[];
  // overview
  overview?: SpaceOverview;
  progress?: ProgressOverview;

  createdAt: string;
  updatedAt: string;
}

export interface SpaceEnvironment {
  name: string;
  url: string;
}

export interface SpaceCreate {
  name: string;
}

export interface SpaceUpdate {
  name: string;
}

export interface SpaceOverview {
  translationsCount: number;
  translationsSize: number;
  assetsCount: number;
  assetsSize: number;
  contentsCount: number;
  contentsSize: number;
  schemasCount: number;
  tasksCount: number;
  tasksSize: number;
  totalSize: number;
  updatedAt: string;
}

export interface ProgressOverview {
  translations: Record<string, number>;
}
