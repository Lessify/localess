/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface ReposCreateInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
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
 * The visibility of the repository.
 */
'visibility'?: 'public' | 'private';

/**
 * Either `true` to enable issues for this repository or `false` to disable them.
 */
'has_issues'?: boolean;

/**
 * Either `true` to enable projects for this repository or `false` to disable them. **Note:** If you're creating a repository in an organization that has disabled repository projects, the default is `false`, and if you pass `true`, the API returns an error.
 */
'has_projects'?: boolean;

/**
 * Either `true` to enable the wiki for this repository or `false` to disable it.
 */
'has_wiki'?: boolean;

/**
 * Whether downloads are enabled.
 */
'has_downloads'?: boolean;

/**
 * Either `true` to make this repo available as a template repository or `false` to prevent it.
 */
'is_template'?: boolean;

/**
 * The id of the team that will be granted access to this repository. This is only valid when creating a repository in an organization.
 */
'team_id'?: number;

/**
 * Pass `true` to create an initial commit with empty README.
 */
'auto_init'?: boolean;

/**
 * Desired language or platform [.gitignore template](https://github.com/github/gitignore) to apply. Use the name of the template without the extension. For example, "Haskell".
 */
'gitignore_template'?: string;

/**
 * Choose an [open source license template](https://choosealicense.com/) that best suits your needs, and then use the [license keyword](https://docs.github.com/articles/licensing-a-repository/#searching-github-by-license-type) as the `license_template` string. For example, "mit" or "mpl-2.0".
 */
'license_template'?: string;

/**
 * Either `true` to allow squash-merging pull requests, or `false` to prevent squash-merging.
 */
'allow_squash_merge'?: boolean;

/**
 * Either `true` to allow merging pull requests with a merge commit, or `false` to prevent merging pull requests with merge commits.
 */
'allow_merge_commit'?: boolean;

/**
 * Either `true` to allow rebase-merging pull requests, or `false` to prevent rebase-merging.
 */
'allow_rebase_merge'?: boolean;

/**
 * Either `true` to allow auto-merge on pull requests, or `false` to disallow auto-merge.
 */
'allow_auto_merge'?: boolean;

/**
 * Either `true` to allow automatically deleting head branches when pull requests are merged, or `false` to prevent automatic deletion. **The authenticated user must be an organization owner to set this property to `true`.**
 */
'delete_branch_on_merge'?: boolean;

/**
 * Either `true` to allow squash-merge commits to use pull request title, or `false` to use commit message. **This property has been deprecated. Please use `squash_merge_commit_title` instead.
 *
 * @deprecated
 */
'use_squash_pr_title_as_default'?: boolean;

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
}
}

export function reposCreateInOrg(http: HttpClient, rootUrl: string, params: ReposCreateInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Repository>> {
  const rb = new RequestBuilder(rootUrl, reposCreateInOrg.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
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

reposCreateInOrg.PATH = '/orgs/{org}/repos';
