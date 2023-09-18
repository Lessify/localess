/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProtectedBranchPullRequestReview } from '../../models/protected-branch-pull-request-review';

export interface ReposUpdatePullRequestReviewProtection$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the branch. Cannot contain wildcard characters. To use wildcard characters in branch names, use [the GraphQL API](https://docs.github.com/graphql).
 */
  branch: string;
      body?: {

/**
 * Specify which users, teams, and apps can dismiss pull request reviews. Pass an empty `dismissal_restrictions` object to disable. User and team `dismissal_restrictions` are only available for organization-owned repositories. Omit this parameter for personal repositories.
 */
'dismissal_restrictions'?: {

/**
 * The list of user `login`s with dismissal access
 */
'users'?: Array<string>;

/**
 * The list of team `slug`s with dismissal access
 */
'teams'?: Array<string>;

/**
 * The list of app `slug`s with dismissal access
 */
'apps'?: Array<string>;
};

/**
 * Set to `true` if you want to automatically dismiss approving reviews when someone pushes a new commit.
 */
'dismiss_stale_reviews'?: boolean;

/**
 * Blocks merging pull requests until [code owners](https://docs.github.com/articles/about-code-owners/) have reviewed.
 */
'require_code_owner_reviews'?: boolean;

/**
 * Specifies the number of reviewers required to approve pull requests. Use a number between 1 and 6 or 0 to not require reviewers.
 */
'required_approving_review_count'?: number;

/**
 * Whether the most recent push must be approved by someone other than the person who pushed it. Default: `false`
 */
'require_last_push_approval'?: boolean;

/**
 * Allow specific users, teams, or apps to bypass pull request requirements.
 */
'bypass_pull_request_allowances'?: {

/**
 * The list of user `login`s allowed to bypass pull request requirements.
 */
'users'?: Array<string>;

/**
 * The list of team `slug`s allowed to bypass pull request requirements.
 */
'teams'?: Array<string>;

/**
 * The list of app `slug`s allowed to bypass pull request requirements.
 */
'apps'?: Array<string>;
};
}
}

export function reposUpdatePullRequestReviewProtection(http: HttpClient, rootUrl: string, params: ReposUpdatePullRequestReviewProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranchPullRequestReview>> {
  const rb = new RequestBuilder(rootUrl, reposUpdatePullRequestReviewProtection.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('branch', params.branch, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ProtectedBranchPullRequestReview>;
    })
  );
}

reposUpdatePullRequestReviewProtection.PATH = '/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews';
