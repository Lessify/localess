/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface ReposCreateForAuthenticatedUser$Params {
      body: {

/**
 * The name of the repository.
 */
'name': string;

/**
 * A short description of the repository.
 */
'description'?: string;

/**
 * A URL with more information about the repository.
 */
'homepage'?: string;

/**
 * Whether the repository is private.
 */
'private'?: boolean;

/**
 * Whether issues are enabled.
 */
'has_issues'?: boolean;

/**
 * Whether projects are enabled.
 */
'has_projects'?: boolean;

/**
 * Whether the wiki is enabled.
 */
'has_wiki'?: boolean;

/**
 * Whether discussions are enabled.
 */
'has_discussions'?: boolean;

/**
 * The id of the team that will be granted access to this repository. This is only valid when creating a repository in an organization.
 */
'team_id'?: number;

/**
 * Whether the repository is initialized with a minimal README.
 */
'auto_init'?: boolean;

/**
 * The desired language or platform to apply to the .gitignore.
 */
'gitignore_template'?: string;

/**
 * The license keyword of the open source license for this repository.
 */
'license_template'?: string;

/**
 * Whether to allow squash merges for pull requests.
 */
'allow_squash_merge'?: boolean;

/**
 * Whether to allow merge commits for pull requests.
 */
'allow_merge_commit'?: boolean;

/**
 * Whether to allow rebase merges for pull requests.
 */
'allow_rebase_merge'?: boolean;

/**
 * Whether to allow Auto-merge to be used on pull requests.
 */
'allow_auto_merge'?: boolean;

/**
 * Whether to delete head branches when pull requests are merged
 */
'delete_branch_on_merge'?: boolean;

/**
 * The default value for a squash merge commit title:
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
 */
'squash_merge_commit_title'?: 'PR_TITLE' | 'COMMIT_OR_PR_TITLE';

/**
 * The default value for a squash merge commit message:
 *
 * - `PR_BODY` - default to the pull request's body.
 * - `COMMIT_MESSAGES` - default to the branch's commit messages.
 * - `BLANK` - default to a blank commit message.
 */
'squash_merge_commit_message'?: 'PR_BODY' | 'COMMIT_MESSAGES' | 'BLANK';

/**
 * The default value for a merge commit title.
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
 */
'merge_commit_title'?: 'PR_TITLE' | 'MERGE_MESSAGE';

/**
 * The default value for a merge commit message.
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `PR_BODY` - default to the pull request's body.
 * - `BLANK` - default to a blank commit message.
 */
'merge_commit_message'?: 'PR_BODY' | 'PR_TITLE' | 'BLANK';

/**
 * Whether downloads are enabled.
 */
'has_downloads'?: boolean;

/**
 * Whether this repository acts as a template that can be used to generate new repositories.
 */
'is_template'?: boolean;
}
}

export function reposCreateForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ReposCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
  const rb = new RequestBuilder(rootUrl, reposCreateForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Repository>;
    })
  );
}

reposCreateForAuthenticatedUser.PATH = '/user/repos';
