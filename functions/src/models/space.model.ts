import { Timestamp } from 'firebase-admin/firestore';
import { Locale } from './locale.model';

export interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  // overview
  overview?: SpaceOverview;
  // timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpaceOverviewData {
  spaceId: string;
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
