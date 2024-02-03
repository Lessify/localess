import { Release } from '@shared/generated/github/models/release';

export interface ReleasesDialogModel {
  version: string;
  releases: Release[];
}
