/* tslint:disable */
/* eslint-disable */
import { GistHistory } from '../models/gist-history';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { PublicUser } from '../models/public-user';
import { SimpleUser } from '../models/simple-user';

/**
 * Gist Simple
 */
export interface GistSimple {
  comments?: number;
  comments_url?: string;
  commits_url?: string;
  created_at?: string;
  description?: null | string;
  files?: {
[key: string]: {
'filename'?: string;
'type'?: string;
'language'?: string;
'raw_url'?: string;
'size'?: number;
'truncated'?: boolean;
'content'?: string;
};
};

  /**
   * Gist
   */
  fork_of?: null | {
'url': string;
'forks_url': string;
'commits_url': string;
'id': string;
'node_id': string;
'git_pull_url': string;
'git_push_url': string;
'html_url': string;
'files': {
[key: string]: {
'filename'?: string;
'type'?: string;
'language'?: string;
'raw_url'?: string;
'size'?: number;
};
};
'public': boolean;
'created_at': string;
'updated_at': string;
'description': string | null;
'comments': number;
'user': null | NullableSimpleUser;
'comments_url': string;
'owner'?: null | NullableSimpleUser;
'truncated'?: boolean;
'forks'?: Array<any>;
'history'?: Array<any>;
};
  /** @deprecated */forks?: null | Array<{
'id'?: string;
'url'?: string;
'user'?: PublicUser;
'created_at'?: string;
'updated_at'?: string;
}>;
  forks_url?: string;
  git_pull_url?: string;
  git_push_url?: string;
  /** @deprecated */history?: null | Array<GistHistory>;
  html_url?: string;
  id?: string;
  node_id?: string;
  owner?: SimpleUser;
  public?: boolean;
  truncated?: boolean;
  updated_at?: string;
  url?: string;
  user?: null | string;
}
