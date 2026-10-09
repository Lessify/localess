import type { Locale } from './locale.model.js';
import type { Timestamp } from './timestamp.js';

export interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  /** Preview environments for the Visual Editor (http(s) URLs only). */
  environments?: SpaceEnvironment[];
  // overview
  overview?: SpaceOverview;
  progress?: ProgressOverview;
  // timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceEnvironment {
  name: string;
  url: string;
}

// App API requests
export interface SpaceCreate {
  name: string;
}

export interface SpaceUpdate {
  name: string;
}

export interface SpaceOverviewData {
  spaceId: string;
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
  updatedAt: Timestamp;
}

export interface ProgressOverview {
  translations: Record<string, number>;
}
