/* tslint:disable */
/* eslint-disable */
import { DiffEntry } from '../models/diff-entry';
import { NullableGitUser } from '../models/nullable-git-user';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { Verification } from '../models/verification';

/**
 * Commit
 */
export interface Commit {
  author: null | NullableSimpleUser;
  comments_url: string;
  commit: {
'url': string;
'author': null | NullableGitUser;
'committer': null | NullableGitUser;
'message': string;
'comment_count': number;
'tree': {
'sha': string;
'url': string;
};
'verification'?: Verification;
};
  committer: null | NullableSimpleUser;
  files?: Array<DiffEntry>;
  html_url: string;
  node_id: string;
  parents: Array<{
'sha': string;
'url': string;
'html_url'?: string;
}>;
  sha: string;
  stats?: {
'additions'?: number;
'deletions'?: number;
'total'?: number;
};
  url: string;
}
