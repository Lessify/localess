/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { SimpleUser } from '../models/simple-user';

/**
 * Base Gist
 */
export interface BaseGist {
  comments: number;
  comments_url: string;
  commits_url: string;
  created_at: string;
  description: null | string;
  files: {
[key: string]: {
'filename'?: string;
'type'?: string;
'language'?: string;
'raw_url'?: string;
'size'?: number;
};
};
  forks?: Array<any>;
  forks_url: string;
  git_pull_url: string;
  git_push_url: string;
  history?: Array<any>;
  html_url: string;
  id: string;
  node_id: string;
  owner?: SimpleUser;
  public: boolean;
  truncated?: boolean;
  updated_at: string;
  url: string;
  user: null | NullableSimpleUser;
}
