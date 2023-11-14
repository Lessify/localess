/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Data related to a release.
 */
export interface ReleaseAsset {
  browser_download_url: string;
  content_type: string;
  created_at: string;
  download_count: number;
  id: number;
  label: string | null;

  /**
   * The file name of the asset.
   */
  name: string;
  node_id: string;
  size: number;

  /**
   * State of the release asset.
   */
  state: 'uploaded' | 'open';
  updated_at: string;
  uploader: NullableSimpleUser | null;
  url: string;
}
