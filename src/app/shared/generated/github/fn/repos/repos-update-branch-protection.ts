/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProtectedBranch } from '../../models/protected-branch';

export interface ReposUpdateBranchProtection$Params {

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
      body: {

/**
 * Require status checks to pass before merging. Set to `null` to disable.
 */
'required_status_checks': ({

/**
 * Require branches to be up to date before merging.
 */
'strict': boolean;

/**
 * **Deprecated**: The list of status checks to require in order to merge into this branch. If any of these checks have recently been set by a particular GitHub App, they will be required to come from that app in future for the branch to merge. Use `checks` instead of `contexts` for more fine-grained control.
 *
 * @deprecated
 */
'contexts': Array<string>;

/**
 * The list of status checks to require in order to merge into this branch.
 */
'checks'?: Array<{

/**
 * The name of the required check
 */
'context': string;

/**
 * The ID of the GitHub App that must provide this check. Omit this field to automatically select the GitHub App that has recently provided this check, or any app if it was not set by a GitHub App. Pass -1 to explicitly allow any app to set the status.
 */
'app_id'?: number;
}>;
}) | null;

/**
 * Enforce all configured restrictions for administrators. Set to `true` to enforce required status checks for repository administrators. Set to `null` to disable.
 */
'enforce_admins': boolean | null;

/**
 * Require at least one approving review on a pull request, before merging. Set to `null` to disable.
 */
'required_pull_request_reviews': ({

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
 * Blocks merging pull requests until [code owners](https://docs.github.com/articles/about-code-owners/) review them.
 */
'require_code_owner_reviews'?: boolean;

/**
 * Specify the number of reviewers required to approve pull requests. Use a number between 1 and 6 or 0 to not require reviewers.
 */
'required_approving_review_count'?: number;

/**
 * Whether the most recent push must be approved by someone other than the person who pushed it. Default: `false`.
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
}) | null;

/**
 * Restrict who can push to the protected branch. User, app, and team `restrictions` are only available for organization-owned repositories. Set to `null` to disable.
 */
'restrictions': ({

/**
 * The list of user `login`s with push access
 */
'users': Array<string>;

/**
 * The list of team `slug`s with push access
 */
'teams': Array<string>;

/**
 * The list of app `slug`s with push access
 */
'apps'?: Array<string>;
}) | null;

/**
 * Enforces a linear commit Git history, which prevents anyone from pushing merge commits to a branch. Set to `true` to enforce a linear commit history. Set to `false` to disable a linear commit Git history. Your repository must allow squash merging or rebase merging before you can enable a linear commit history. Default: `false`. For more information, see "[Requiring a linear commit history](https://docs.github.com/github/administering-a-repository/requiring-a-linear-commit-history)" in the GitHub Help documentation.
 */
'required_linear_history'?: boolean;

/**
 * Permits force pushes to the protected branch by anyone with write access to the repository. Set to `true` to allow force pushes. Set to `false` or `null` to block force pushes. Default: `false`. For more information, see "[Enabling force pushes to a protected branch](https://docs.github.com/github/administering-a-repository/enabling-force-pushes-to-a-protected-branch)" in the GitHub Help documentation."
 */
'allow_force_pushes'?: boolean | null;

/**
 * Allows deletion of the protected branch by anyone with write access to the repository. Set to `false` to prevent deletion of the protected branch. Default: `false`. For more information, see "[Enabling force pushes to a protected branch](https://docs.github.com/github/administering-a-repository/enabling-force-pushes-to-a-protected-branch)" in the GitHub Help documentation.
 */
'allow_deletions'?: boolean;

/**
 * If set to `true`, the `restrictions` branch protection settings which limits who can push will also block pushes which create new branches, unless the push is initiated by a user, team, or app which has the ability to push. Set to `true` to restrict new branch creation. Default: `false`.
 */
'block_creations'?: boolean;

/**
 * Requires all conversations on code to be resolved before a pull request can be merged into a branch that matches this rule. Set to `false` to disable. Default: `false`.
 */
'required_conversation_resolution'?: boolean;

/**
 * Whether to set the branch as read-only. If this is true, users will not be able to push to the branch. Default: `false`.
 */
'lock_branch'?: boolean;

/**
 * Whether users can pull changes from upstream when the branch is locked. Set to `true` to allow fork syncing. Set to `false` to prevent fork syncing. Default: `false`.
 */
'allow_fork_syncing'?: boolean;
}
}

export function reposUpdateBranchProtection(http: HttpClient, rootUrl: string, params: ReposUpdateBranchProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<ProtectedBranch>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateBranchProtection.PATH, 'put');
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
      return r as StrictHttpResponse<ProtectedBranch>;
    })
  );
}

reposUpdateBranchProtection.PATH = '/repos/{owner}/{repo}/branches/{branch}/protection';
