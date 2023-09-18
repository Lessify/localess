/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { NullableGitUser } from '../models/nullable-git-user';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { SearchResultTextMatches } from '../models/search-result-text-matches';
import { Verification } from '../models/verification';

/**
 * Commit Search Result Item
 */
export interface CommitSearchResultItem {
  author: null | NullableSimpleUser;
  comments_url: string;
  commit: {
'author': {
'name': string;
'email': string;
'date': string;
};
'committer': null | NullableGitUser;
'comment_count': number;
'message': string;
'tree': {
'sha': string;
'url': string;
};
'url': string;
'verification'?: Verification;
};
  committer: null | NullableGitUser;
  html_url: string;
  node_id: string;
  parents: Array<{
'url'?: string;
'html_url'?: string;
'sha'?: string;
}>;
  repository: MinimalRepository;
  score: number;
  sha: string;
  text_matches?: SearchResultTextMatches;
  url: string;
}
