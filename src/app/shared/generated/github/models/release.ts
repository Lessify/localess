/* tslint:disable */
/* eslint-disable */
import { ReactionRollup } from '../models/reaction-rollup';
import { ReleaseAsset } from '../models/release-asset';
import { SimpleUser } from '../models/simple-user';

/**
 * A release.
 */
export interface Release {
  assets: Array<ReleaseAsset>;
  assets_url: string;
  author: SimpleUser;
  body?: string | null;
  body_html?: string;
  body_text?: string;
  created_at: string;

  /**
   * The URL of the release discussion.
   */
  discussion_url?: string;

  /**
   * true to create a draft (unpublished) release, false to create a published one.
   */
  draft: boolean;
  html_url: string;
  id: number;
  mentions_count?: number;
  name: string | null;
  node_id: string;

  /**
   * Whether to identify the release as a prerelease or a full release.
   */
  prerelease: boolean;
  published_at: string | null;
  reactions?: ReactionRollup;

  /**
   * The name of the tag.
   */
  tag_name: string;
  tarball_url: string | null;

  /**
   * Specifies the commitish value that determines where the Git tag is created from.
   */
  target_commitish: string;
  upload_url: string;
  url: string;
  zipball_url: string | null;
}
