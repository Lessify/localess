/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { FullRepository } from '../../models/full-repository';

export interface ReposUpdate$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body?: {

/**
 * The name of the repository.
 */
'name'?: string;

/**
 * A short description of the repository.
 */
'description'?: string;

/**
 * A URL with more information about the repository.
 */
'homepage'?: string;

/**
 * Either `true` to make the repository private or `false` to make it public. Default: `false`.  
 * **Note**: You will get a `422` error if the organization restricts [changing repository visibility](https://docs.github.com/articles/repository-permission-levels-for-an-organization#changing-the-visibility-of-repositories) to organization owners and a non-owner tries to change the value of private.
 */
'private'?: boolean;

/**
 * The visibility of the repository.
 */
'visibility'?: 'public' | 'private';

/**
 * Specify which security and analysis features to enable or disable for the repository.
 *
 * To use this parameter, you must have admin permissions for the repository or be an owner or security manager for the organization that owns the repository. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
 *
 * For example, to enable GitHub Advanced Security, use this data in the body of the `PATCH` request:
 * `{ "security_and_analysis": {"advanced_security": { "status": "enabled" } } }`.
 *
 * You can check which security and analysis features are currently enabled by using a `GET /repos/{owner}/{repo}` request.
 */
'security_and_analysis'?: ({

/**
 * Use the `status` property to enable or disable GitHub Advanced Security for this repository. For more information, see "[About GitHub Advanced Security](/github/getting-started-with-github/learning-about-github/about-github-advanced-security)."
 */
'advanced_security'?: {

/**
 * Can be `enabled` or `disabled`.
 */
'status'?: string;
};

/**
 * Use the `status` property to enable or disable secret scanning for this repository. For more information, see "[About secret scanning](/code-security/secret-security/about-secret-scanning)."
 */
'secret_scanning'?: {

/**
 * Can be `enabled` or `disabled`.
 */
'status'?: string;
};

/**
 * Use the `status` property to enable or disable secret scanning push protection for this repository. For more information, see "[Protecting pushes with secret scanning](/code-security/secret-scanning/protecting-pushes-with-secret-scanning)."
 */
'secret_scanning_push_protection'?: {

/**
 * Can be `enabled` or `disabled`.
 */
'status'?: string;
};
}) | null;

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
 * Either `true` to make this repo available as a template repository or `false` to prevent it.
 */
'is_template'?: boolean;

/**
 * Updates the default branch for this repository.
 */
'default_branch'?: string;

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
 * Either `true` to allow automatically deleting head branches when pull requests are merged, or `false` to prevent automatic deletion.
 */
'delete_branch_on_merge'?: boolean;

/**
 * Either `true` to always allow a pull request head branch that is behind its base branch to be updated even if it is not required to be up to date before merging, or false otherwise.
 */
'allow_update_branch'?: boolean;

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

/**
 * Whether to archive this repository. `false` will unarchive a previously archived repository.
 */
'archived'?: boolean;

/**
 * Either `true` to allow private forks, or `false` to prevent private forks.
 */
'allow_forking'?: boolean;

/**
 * Either `true` to require contributors to sign off on web-based commits, or `false` to not require contributors to sign off on web-based commits.
 */
'web_commit_signoff_required'?: boolean;
}
}

export function reposUpdate(http: HttpClient, rootUrl: string, params: ReposUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<FullRepository>> {
  const rb = new RequestBuilder(rootUrl, reposUpdate.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<FullRepository>;
    })
  );
}

reposUpdate.PATH = '/repos/{owner}/{repo}';
