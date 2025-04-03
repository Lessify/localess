import { Timestamp } from 'firebase-admin/firestore';
import { Locale } from './locale.model';

export const DEFAULT_LOCALE: Locale = { id: 'en', name: 'English' };

export interface Space {
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  // overview
  overview?: SpaceOverview;
  progress?: ProgressOverview;
  // timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
