/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Commit } from '../models/commit';
import { DiffEntry } from '../models/diff-entry';
import { PullRequest } from '../models/pull-request';
import { PullRequestMergeResult } from '../models/pull-request-merge-result';
import { PullRequestReview } from '../models/pull-request-review';
import { PullRequestReviewComment } from '../models/pull-request-review-comment';
import { PullRequestReviewRequest } from '../models/pull-request-review-request';
import { PullRequestSimple } from '../models/pull-request-simple';
import { pullsCheckIfMerged } from '../fn/pulls/pulls-check-if-merged';
import { PullsCheckIfMerged$Params } from '../fn/pulls/pulls-check-if-merged';
import { pullsCreate } from '../fn/pulls/pulls-create';
import { PullsCreate$Params } from '../fn/pulls/pulls-create';
import { pullsCreateReplyForReviewComment } from '../fn/pulls/pulls-create-reply-for-review-comment';
import { PullsCreateReplyForReviewComment$Params } from '../fn/pulls/pulls-create-reply-for-review-comment';
import { pullsCreateReview } from '../fn/pulls/pulls-create-review';
import { PullsCreateReview$Params } from '../fn/pulls/pulls-create-review';
import { pullsCreateReviewComment } from '../fn/pulls/pulls-create-review-comment';
import { PullsCreateReviewComment$Params } from '../fn/pulls/pulls-create-review-comment';
import { pullsDeletePendingReview } from '../fn/pulls/pulls-delete-pending-review';
import { PullsDeletePendingReview$Params } from '../fn/pulls/pulls-delete-pending-review';
import { pullsDeleteReviewComment } from '../fn/pulls/pulls-delete-review-comment';
import { PullsDeleteReviewComment$Params } from '../fn/pulls/pulls-delete-review-comment';
import { pullsDismissReview } from '../fn/pulls/pulls-dismiss-review';
import { PullsDismissReview$Params } from '../fn/pulls/pulls-dismiss-review';
import { pullsGet } from '../fn/pulls/pulls-get';
import { PullsGet$Params } from '../fn/pulls/pulls-get';
import { pullsGetReview } from '../fn/pulls/pulls-get-review';
import { PullsGetReview$Params } from '../fn/pulls/pulls-get-review';
import { pullsGetReviewComment } from '../fn/pulls/pulls-get-review-comment';
import { PullsGetReviewComment$Params } from '../fn/pulls/pulls-get-review-comment';
import { pullsList } from '../fn/pulls/pulls-list';
import { PullsList$Params } from '../fn/pulls/pulls-list';
import { pullsListCommentsForReview } from '../fn/pulls/pulls-list-comments-for-review';
import { PullsListCommentsForReview$Params } from '../fn/pulls/pulls-list-comments-for-review';
import { pullsListCommits } from '../fn/pulls/pulls-list-commits';
import { PullsListCommits$Params } from '../fn/pulls/pulls-list-commits';
import { pullsListFiles } from '../fn/pulls/pulls-list-files';
import { PullsListFiles$Params } from '../fn/pulls/pulls-list-files';
import { pullsListRequestedReviewers } from '../fn/pulls/pulls-list-requested-reviewers';
import { PullsListRequestedReviewers$Params } from '../fn/pulls/pulls-list-requested-reviewers';
import { pullsListReviewComments } from '../fn/pulls/pulls-list-review-comments';
import { PullsListReviewComments$Params } from '../fn/pulls/pulls-list-review-comments';
import { pullsListReviewCommentsForRepo } from '../fn/pulls/pulls-list-review-comments-for-repo';
import { PullsListReviewCommentsForRepo$Params } from '../fn/pulls/pulls-list-review-comments-for-repo';
import { pullsListReviews } from '../fn/pulls/pulls-list-reviews';
import { PullsListReviews$Params } from '../fn/pulls/pulls-list-reviews';
import { pullsMerge } from '../fn/pulls/pulls-merge';
import { PullsMerge$Params } from '../fn/pulls/pulls-merge';
import { pullsRemoveRequestedReviewers } from '../fn/pulls/pulls-remove-requested-reviewers';
import { PullsRemoveRequestedReviewers$Params } from '../fn/pulls/pulls-remove-requested-reviewers';
import { pullsRequestReviewers } from '../fn/pulls/pulls-request-reviewers';
import { PullsRequestReviewers$Params } from '../fn/pulls/pulls-request-reviewers';
import { pullsSubmitReview } from '../fn/pulls/pulls-submit-review';
import { PullsSubmitReview$Params } from '../fn/pulls/pulls-submit-review';
import { pullsUpdate } from '../fn/pulls/pulls-update';
import { PullsUpdate$Params } from '../fn/pulls/pulls-update';
import { pullsUpdateBranch } from '../fn/pulls/pulls-update-branch';
import { PullsUpdateBranch$Params } from '../fn/pulls/pulls-update-branch';
import { pullsUpdateReview } from '../fn/pulls/pulls-update-review';
import { PullsUpdateReview$Params } from '../fn/pulls/pulls-update-review';
import { pullsUpdateReviewComment } from '../fn/pulls/pulls-update-review-comment';
import { PullsUpdateReviewComment$Params } from '../fn/pulls/pulls-update-review-comment';
import { ReviewComment } from '../models/review-comment';


/**
 * Interact with GitHub Pull Requests.
 */
@Injectable({ providedIn: 'root' })
export class PullsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `pullsList()` */
  static readonly PullsListPath = '/repos/{owner}/{repo}/pulls';

  /**
   * List pull requests.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsList()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsList$Response(params: PullsList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestSimple>>> {
    return pullsList(this.http, this.rootUrl, params, context);
  }

  /**
   * List pull requests.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsList(params: PullsList$Params, context?: HttpContext): Observable<Array<PullRequestSimple>> {
    return this.pullsList$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PullRequestSimple>>): Array<PullRequestSimple> => r.body)
    );
  }

  /** Path part for operation `pullsCreate()` */
  static readonly PullsCreatePath = '/repos/{owner}/{repo}/pulls';

  /**
   * Create a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To open or update a pull request in a public repository, you must have write access to the head or the source branch. For organization-owned repositories, you must be a member of the organization that owns the repository to open or update a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsCreate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreate$Response(params: PullsCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequest>> {
    return pullsCreate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To open or update a pull request in a public repository, you must have write access to the head or the source branch. For organization-owned repositories, you must be a member of the organization that owns the repository to open or update a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsCreate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreate(params: PullsCreate$Params, context?: HttpContext): Observable<PullRequest> {
    return this.pullsCreate$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequest>): PullRequest => r.body)
    );
  }

  /** Path part for operation `pullsListReviewCommentsForRepo()` */
  static readonly PullsListReviewCommentsForRepoPath = '/repos/{owner}/{repo}/pulls/comments';

  /**
   * List review comments in a repository.
   *
   * Lists review comments for all pull requests in a repository. By default, review comments are in ascending order by ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListReviewCommentsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviewCommentsForRepo$Response(params: PullsListReviewCommentsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestReviewComment>>> {
    return pullsListReviewCommentsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List review comments in a repository.
   *
   * Lists review comments for all pull requests in a repository. By default, review comments are in ascending order by ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListReviewCommentsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviewCommentsForRepo(params: PullsListReviewCommentsForRepo$Params, context?: HttpContext): Observable<Array<PullRequestReviewComment>> {
    return this.pullsListReviewCommentsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PullRequestReviewComment>>): Array<PullRequestReviewComment> => r.body)
    );
  }

  /** Path part for operation `pullsGetReviewComment()` */
  static readonly PullsGetReviewCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}';

  /**
   * Get a review comment for a pull request.
   *
   * Provides details for a review comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsGetReviewComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGetReviewComment$Response(params: PullsGetReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewComment>> {
    return pullsGetReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a review comment for a pull request.
   *
   * Provides details for a review comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsGetReviewComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGetReviewComment(params: PullsGetReviewComment$Params, context?: HttpContext): Observable<PullRequestReviewComment> {
    return this.pullsGetReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReviewComment>): PullRequestReviewComment => r.body)
    );
  }

  /** Path part for operation `pullsDeleteReviewComment()` */
  static readonly PullsDeleteReviewCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}';

  /**
   * Delete a review comment for a pull request.
   *
   * Deletes a review comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsDeleteReviewComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsDeleteReviewComment$Response(params: PullsDeleteReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return pullsDeleteReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a review comment for a pull request.
   *
   * Deletes a review comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsDeleteReviewComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsDeleteReviewComment(params: PullsDeleteReviewComment$Params, context?: HttpContext): Observable<void> {
    return this.pullsDeleteReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `pullsUpdateReviewComment()` */
  static readonly PullsUpdateReviewCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}';

  /**
   * Update a review comment for a pull request.
   *
   * Enables you to edit a review comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsUpdateReviewComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateReviewComment$Response(params: PullsUpdateReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewComment>> {
    return pullsUpdateReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a review comment for a pull request.
   *
   * Enables you to edit a review comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsUpdateReviewComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateReviewComment(params: PullsUpdateReviewComment$Params, context?: HttpContext): Observable<PullRequestReviewComment> {
    return this.pullsUpdateReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReviewComment>): PullRequestReviewComment => r.body)
    );
  }

  /** Path part for operation `pullsGet()` */
  static readonly PullsGetPath = '/repos/{owner}/{repo}/pulls/{pull_number}';

  /**
   * Get a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists details of a pull request by providing its number.
   *
   * When you get, [create](https://docs.github.com/rest/pulls/pulls/#create-a-pull-request), or [edit](https://docs.github.com/rest/pulls/pulls#update-a-pull-request) a pull request, GitHub creates a merge commit to test whether the pull request can be automatically merged into the base branch. This test commit is not added to the base branch or the head branch. You can review the status of the test commit using the `mergeable` key. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * The value of the `mergeable` attribute can be `true`, `false`, or `null`. If the value is `null`, then GitHub has started a background job to compute the mergeability. After giving the job time to complete, resubmit the request. When the job finishes, you will see a non-`null` value for the `mergeable` attribute in the response. If `mergeable` is `true`, then `merge_commit_sha` will be the SHA of the _test_ merge commit.
   *
   * The value of the `merge_commit_sha` attribute changes depending on the state of the pull request. Before merging a pull request, the `merge_commit_sha` attribute holds the SHA of the _test_ merge commit. After merging a pull request, the `merge_commit_sha` attribute changes depending on how you merged the pull request:
   *
   * *   If merged as a [merge commit](https://docs.github.com/articles/about-merge-methods-on-github/), `merge_commit_sha` represents the SHA of the merge commit.
   * *   If merged via a [squash](https://docs.github.com/articles/about-merge-methods-on-github/#squashing-your-merge-commits), `merge_commit_sha` represents the SHA of the squashed commit on the base branch.
   * *   If [rebased](https://docs.github.com/articles/about-merge-methods-on-github/#rebasing-and-merging-your-commits), `merge_commit_sha` represents the commit that the base branch was updated to.
   *
   * Pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to fetch diff and patch formats.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGet$Response(params: PullsGet$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequest>> {
    return pullsGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * Lists details of a pull request by providing its number.
   *
   * When you get, [create](https://docs.github.com/rest/pulls/pulls/#create-a-pull-request), or [edit](https://docs.github.com/rest/pulls/pulls#update-a-pull-request) a pull request, GitHub creates a merge commit to test whether the pull request can be automatically merged into the base branch. This test commit is not added to the base branch or the head branch. You can review the status of the test commit using the `mergeable` key. For more information, see "[Checking mergeability of pull requests](https://docs.github.com/rest/guides/getting-started-with-the-git-database-api#checking-mergeability-of-pull-requests)".
   *
   * The value of the `mergeable` attribute can be `true`, `false`, or `null`. If the value is `null`, then GitHub has started a background job to compute the mergeability. After giving the job time to complete, resubmit the request. When the job finishes, you will see a non-`null` value for the `mergeable` attribute in the response. If `mergeable` is `true`, then `merge_commit_sha` will be the SHA of the _test_ merge commit.
   *
   * The value of the `merge_commit_sha` attribute changes depending on the state of the pull request. Before merging a pull request, the `merge_commit_sha` attribute holds the SHA of the _test_ merge commit. After merging a pull request, the `merge_commit_sha` attribute changes depending on how you merged the pull request:
   *
   * *   If merged as a [merge commit](https://docs.github.com/articles/about-merge-methods-on-github/), `merge_commit_sha` represents the SHA of the merge commit.
   * *   If merged via a [squash](https://docs.github.com/articles/about-merge-methods-on-github/#squashing-your-merge-commits), `merge_commit_sha` represents the SHA of the squashed commit on the base branch.
   * *   If [rebased](https://docs.github.com/articles/about-merge-methods-on-github/#rebasing-and-merging-your-commits), `merge_commit_sha` represents the commit that the base branch was updated to.
   *
   * Pass the appropriate [media type](https://docs.github.com/rest/overview/media-types/#commits-commit-comparison-and-pull-requests) to fetch diff and patch formats.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGet(params: PullsGet$Params, context?: HttpContext): Observable<PullRequest> {
    return this.pullsGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequest>): PullRequest => r.body)
    );
  }

  /** Path part for operation `pullsUpdate()` */
  static readonly PullsUpdatePath = '/repos/{owner}/{repo}/pulls/{pull_number}';

  /**
   * Update a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To open or update a pull request in a public repository, you must have write access to the head or the source branch. For organization-owned repositories, you must be a member of the organization that owns the repository to open or update a pull request.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdate$Response(params: PullsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequest>> {
    return pullsUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a pull request.
   *
   * Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To open or update a pull request in a public repository, you must have write access to the head or the source branch. For organization-owned repositories, you must be a member of the organization that owns the repository to open or update a pull request.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdate(params: PullsUpdate$Params, context?: HttpContext): Observable<PullRequest> {
    return this.pullsUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequest>): PullRequest => r.body)
    );
  }

  /** Path part for operation `pullsListReviewComments()` */
  static readonly PullsListReviewCommentsPath = '/repos/{owner}/{repo}/pulls/{pull_number}/comments';

  /**
   * List review comments on a pull request.
   *
   * Lists all review comments for a pull request. By default, review comments are in ascending order by ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListReviewComments()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviewComments$Response(params: PullsListReviewComments$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestReviewComment>>> {
    return pullsListReviewComments(this.http, this.rootUrl, params, context);
  }

  /**
   * List review comments on a pull request.
   *
   * Lists all review comments for a pull request. By default, review comments are in ascending order by ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListReviewComments$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviewComments(params: PullsListReviewComments$Params, context?: HttpContext): Observable<Array<PullRequestReviewComment>> {
    return this.pullsListReviewComments$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PullRequestReviewComment>>): Array<PullRequestReviewComment> => r.body)
    );
  }

  /** Path part for operation `pullsCreateReviewComment()` */
  static readonly PullsCreateReviewCommentPath = '/repos/{owner}/{repo}/pulls/{pull_number}/comments';

  /**
   * Create a review comment for a pull request.
   *
   * Creates a review comment in the pull request diff. To add a regular comment to a pull request timeline, see "[Create an issue comment](https://docs.github.com/rest/issues/comments#create-an-issue-comment)." We recommend creating a review comment using `line`, `side`, and optionally `start_line` and `start_side` if your comment applies to more than one line in the pull request diff.
   *
   * The `position` parameter is deprecated. If you use `position`, the `line`, `side`, `start_line`, and `start_side` parameters are not required.
   *
   * **Note:** The position value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsCreateReviewComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReviewComment$Response(params: PullsCreateReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewComment>> {
    return pullsCreateReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a review comment for a pull request.
   *
   * Creates a review comment in the pull request diff. To add a regular comment to a pull request timeline, see "[Create an issue comment](https://docs.github.com/rest/issues/comments#create-an-issue-comment)." We recommend creating a review comment using `line`, `side`, and optionally `start_line` and `start_side` if your comment applies to more than one line in the pull request diff.
   *
   * The `position` parameter is deprecated. If you use `position`, the `line`, `side`, `start_line`, and `start_side` parameters are not required.
   *
   * **Note:** The position value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsCreateReviewComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReviewComment(params: PullsCreateReviewComment$Params, context?: HttpContext): Observable<PullRequestReviewComment> {
    return this.pullsCreateReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReviewComment>): PullRequestReviewComment => r.body)
    );
  }

  /** Path part for operation `pullsCreateReplyForReviewComment()` */
  static readonly PullsCreateReplyForReviewCommentPath = '/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies';

  /**
   * Create a reply for a review comment.
   *
   * Creates a reply to a review comment for a pull request. For the `comment_id`, provide the ID of the review comment you are replying to. This must be the ID of a _top-level review comment_, not a reply to that comment. Replies to replies are not supported.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsCreateReplyForReviewComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReplyForReviewComment$Response(params: PullsCreateReplyForReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewComment>> {
    return pullsCreateReplyForReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a reply for a review comment.
   *
   * Creates a reply to a review comment for a pull request. For the `comment_id`, provide the ID of the review comment you are replying to. This must be the ID of a _top-level review comment_, not a reply to that comment. Replies to replies are not supported.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsCreateReplyForReviewComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReplyForReviewComment(params: PullsCreateReplyForReviewComment$Params, context?: HttpContext): Observable<PullRequestReviewComment> {
    return this.pullsCreateReplyForReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReviewComment>): PullRequestReviewComment => r.body)
    );
  }

  /** Path part for operation `pullsListCommits()` */
  static readonly PullsListCommitsPath = '/repos/{owner}/{repo}/pulls/{pull_number}/commits';

  /**
   * List commits on a pull request.
   *
   * Lists a maximum of 250 commits for a pull request. To receive a complete commit list for pull requests with more than 250 commits, use the [List commits](https://docs.github.com/rest/commits/commits#list-commits) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListCommits()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListCommits$Response(params: PullsListCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Commit>>> {
    return pullsListCommits(this.http, this.rootUrl, params, context);
  }

  /**
   * List commits on a pull request.
   *
   * Lists a maximum of 250 commits for a pull request. To receive a complete commit list for pull requests with more than 250 commits, use the [List commits](https://docs.github.com/rest/commits/commits#list-commits) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListCommits$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListCommits(params: PullsListCommits$Params, context?: HttpContext): Observable<Array<Commit>> {
    return this.pullsListCommits$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Commit>>): Array<Commit> => r.body)
    );
  }

  /** Path part for operation `pullsListFiles()` */
  static readonly PullsListFilesPath = '/repos/{owner}/{repo}/pulls/{pull_number}/files';

  /**
   * List pull requests files.
   *
   * **Note:** Responses include a maximum of 3000 files. The paginated response returns 30 files per page by default.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListFiles()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListFiles$Response(params: PullsListFiles$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DiffEntry>>> {
    return pullsListFiles(this.http, this.rootUrl, params, context);
  }

  /**
   * List pull requests files.
   *
   * **Note:** Responses include a maximum of 3000 files. The paginated response returns 30 files per page by default.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListFiles$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListFiles(params: PullsListFiles$Params, context?: HttpContext): Observable<Array<DiffEntry>> {
    return this.pullsListFiles$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DiffEntry>>): Array<DiffEntry> => r.body)
    );
  }

  /** Path part for operation `pullsCheckIfMerged()` */
  static readonly PullsCheckIfMergedPath = '/repos/{owner}/{repo}/pulls/{pull_number}/merge';

  /**
   * Check if a pull request has been merged.
   *
   * Checks if a pull request has been merged into the base branch. The HTTP status of the response indicates whether or not the pull request has been merged; the response body is empty.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsCheckIfMerged()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsCheckIfMerged$Response(params: PullsCheckIfMerged$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return pullsCheckIfMerged(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a pull request has been merged.
   *
   * Checks if a pull request has been merged into the base branch. The HTTP status of the response indicates whether or not the pull request has been merged; the response body is empty.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsCheckIfMerged$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsCheckIfMerged(params: PullsCheckIfMerged$Params, context?: HttpContext): Observable<void> {
    return this.pullsCheckIfMerged$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `pullsMerge()` */
  static readonly PullsMergePath = '/repos/{owner}/{repo}/pulls/{pull_number}/merge';

  /**
   * Merge a pull request.
   *
   * Merges a pull request into the base branch.
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsMerge()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsMerge$Response(params: PullsMerge$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestMergeResult>> {
    return pullsMerge(this.http, this.rootUrl, params, context);
  }

  /**
   * Merge a pull request.
   *
   * Merges a pull request into the base branch.
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsMerge$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsMerge(params: PullsMerge$Params, context?: HttpContext): Observable<PullRequestMergeResult> {
    return this.pullsMerge$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestMergeResult>): PullRequestMergeResult => r.body)
    );
  }

  /** Path part for operation `pullsListRequestedReviewers()` */
  static readonly PullsListRequestedReviewersPath = '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers';

  /**
   * Get all requested reviewers for a pull request.
   *
   * Gets the users or teams whose review is requested for a pull request. Once a requested reviewer submits a review, they are no longer considered a requested reviewer. Their review will instead be returned by the [List reviews for a pull request](https://docs.github.com/rest/pulls/reviews#list-reviews-for-a-pull-request) operation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListRequestedReviewers()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListRequestedReviewers$Response(params: PullsListRequestedReviewers$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReviewRequest>> {
    return pullsListRequestedReviewers(this.http, this.rootUrl, params, context);
  }

  /**
   * Get all requested reviewers for a pull request.
   *
   * Gets the users or teams whose review is requested for a pull request. Once a requested reviewer submits a review, they are no longer considered a requested reviewer. Their review will instead be returned by the [List reviews for a pull request](https://docs.github.com/rest/pulls/reviews#list-reviews-for-a-pull-request) operation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListRequestedReviewers$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListRequestedReviewers(params: PullsListRequestedReviewers$Params, context?: HttpContext): Observable<PullRequestReviewRequest> {
    return this.pullsListRequestedReviewers$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReviewRequest>): PullRequestReviewRequest => r.body)
    );
  }

  /** Path part for operation `pullsRequestReviewers()` */
  static readonly PullsRequestReviewersPath = '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers';

  /**
   * Request reviewers for a pull request.
   *
   * Requests reviews for a pull request from a given set of users and/or teams.
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsRequestReviewers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsRequestReviewers$Response(params: PullsRequestReviewers$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestSimple>> {
    return pullsRequestReviewers(this.http, this.rootUrl, params, context);
  }

  /**
   * Request reviewers for a pull request.
   *
   * Requests reviews for a pull request from a given set of users and/or teams.
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsRequestReviewers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsRequestReviewers(params: PullsRequestReviewers$Params, context?: HttpContext): Observable<PullRequestSimple> {
    return this.pullsRequestReviewers$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestSimple>): PullRequestSimple => r.body)
    );
  }

  /** Path part for operation `pullsRemoveRequestedReviewers()` */
  static readonly PullsRemoveRequestedReviewersPath = '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers';

  /**
   * Remove requested reviewers from a pull request.
   *
   * Removes review requests from a pull request for a given set of users and/or teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsRemoveRequestedReviewers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsRemoveRequestedReviewers$Response(params: PullsRemoveRequestedReviewers$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestSimple>> {
    return pullsRemoveRequestedReviewers(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove requested reviewers from a pull request.
   *
   * Removes review requests from a pull request for a given set of users and/or teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsRemoveRequestedReviewers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsRemoveRequestedReviewers(params: PullsRemoveRequestedReviewers$Params, context?: HttpContext): Observable<PullRequestSimple> {
    return this.pullsRemoveRequestedReviewers$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestSimple>): PullRequestSimple => r.body)
    );
  }

  /** Path part for operation `pullsListReviews()` */
  static readonly PullsListReviewsPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews';

  /**
   * List reviews for a pull request.
   *
   * The list of reviews returns in chronological order.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListReviews()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviews$Response(params: PullsListReviews$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestReview>>> {
    return pullsListReviews(this.http, this.rootUrl, params, context);
  }

  /**
   * List reviews for a pull request.
   *
   * The list of reviews returns in chronological order.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListReviews$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListReviews(params: PullsListReviews$Params, context?: HttpContext): Observable<Array<PullRequestReview>> {
    return this.pullsListReviews$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<PullRequestReview>>): Array<PullRequestReview> => r.body)
    );
  }

  /** Path part for operation `pullsCreateReview()` */
  static readonly PullsCreateReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews';

  /**
   * Create a review for a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * Pull request reviews created in the `PENDING` state are not submitted and therefore do not include the `submitted_at` property in the response. To create a pending review for a pull request, leave the `event` parameter blank. For more information about submitting a `PENDING` review, see "[Submit a review for a pull request](https://docs.github.com/rest/pulls/reviews#submit-a-review-for-a-pull-request)."
   *
   * **Note:** To comment on a specific line in a file, you need to first determine the _position_ of that line in the diff. The GitHub REST API offers the `application/vnd.github.v3.diff` [media type](https://docs.github.com/rest/overview/media-types#commits-commit-comparison-and-pull-requests). To see a pull request diff, add this media type to the `Accept` header of a call to the [single pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) endpoint.
   *
   * The `position` value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsCreateReview()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReview$Response(params: PullsCreateReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsCreateReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a review for a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * Pull request reviews created in the `PENDING` state are not submitted and therefore do not include the `submitted_at` property in the response. To create a pending review for a pull request, leave the `event` parameter blank. For more information about submitting a `PENDING` review, see "[Submit a review for a pull request](https://docs.github.com/rest/pulls/reviews#submit-a-review-for-a-pull-request)."
   *
   * **Note:** To comment on a specific line in a file, you need to first determine the _position_ of that line in the diff. The GitHub REST API offers the `application/vnd.github.v3.diff` [media type](https://docs.github.com/rest/overview/media-types#commits-commit-comparison-and-pull-requests). To see a pull request diff, add this media type to the `Accept` header of a call to the [single pull request](https://docs.github.com/rest/pulls/pulls#get-a-pull-request) endpoint.
   *
   * The `position` value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsCreateReview$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsCreateReview(params: PullsCreateReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsCreateReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsGetReview()` */
  static readonly PullsGetReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}';

  /**
   * Get a review for a pull request.
   *
   * Retrieves a pull request review by its ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsGetReview()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGetReview$Response(params: PullsGetReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsGetReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a review for a pull request.
   *
   * Retrieves a pull request review by its ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsGetReview$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsGetReview(params: PullsGetReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsGetReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsUpdateReview()` */
  static readonly PullsUpdateReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}';

  /**
   * Update a review for a pull request.
   *
   * Update the review summary comment with new text.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsUpdateReview()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateReview$Response(params: PullsUpdateReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsUpdateReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a review for a pull request.
   *
   * Update the review summary comment with new text.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsUpdateReview$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateReview(params: PullsUpdateReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsUpdateReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsDeletePendingReview()` */
  static readonly PullsDeletePendingReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}';

  /**
   * Delete a pending review for a pull request.
   *
   * Deletes a pull request review that has not been submitted. Submitted reviews cannot be deleted.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsDeletePendingReview()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsDeletePendingReview$Response(params: PullsDeletePendingReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsDeletePendingReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a pending review for a pull request.
   *
   * Deletes a pull request review that has not been submitted. Submitted reviews cannot be deleted.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsDeletePendingReview$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsDeletePendingReview(params: PullsDeletePendingReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsDeletePendingReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsListCommentsForReview()` */
  static readonly PullsListCommentsForReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments';

  /**
   * List comments for a pull request review.
   *
   * List comments for a specific pull request review.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsListCommentsForReview()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListCommentsForReview$Response(params: PullsListCommentsForReview$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ReviewComment>>> {
    return pullsListCommentsForReview(this.http, this.rootUrl, params, context);
  }

  /**
   * List comments for a pull request review.
   *
   * List comments for a specific pull request review.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsListCommentsForReview$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  pullsListCommentsForReview(params: PullsListCommentsForReview$Params, context?: HttpContext): Observable<Array<ReviewComment>> {
    return this.pullsListCommentsForReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ReviewComment>>): Array<ReviewComment> => r.body)
    );
  }

  /** Path part for operation `pullsDismissReview()` */
  static readonly PullsDismissReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals';

  /**
   * Dismiss a review for a pull request.
   *
   * **Note:** To dismiss a pull request review on a [protected branch](https://docs.github.com/rest/branches/branch-protection), you must be a repository administrator or be included in the list of people or teams who can dismiss pull request reviews.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsDismissReview()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsDismissReview$Response(params: PullsDismissReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsDismissReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Dismiss a review for a pull request.
   *
   * **Note:** To dismiss a pull request review on a [protected branch](https://docs.github.com/rest/branches/branch-protection), you must be a repository administrator or be included in the list of people or teams who can dismiss pull request reviews.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsDismissReview$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsDismissReview(params: PullsDismissReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsDismissReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsSubmitReview()` */
  static readonly PullsSubmitReviewPath = '/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events';

  /**
   * Submit a review for a pull request.
   *
   * Submits a pending review for a pull request. For more information about creating a pending review for a pull request, see "[Create a review for a pull request](https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsSubmitReview()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsSubmitReview$Response(params: PullsSubmitReview$Params, context?: HttpContext): Observable<StrictHttpResponse<PullRequestReview>> {
    return pullsSubmitReview(this.http, this.rootUrl, params, context);
  }

  /**
   * Submit a review for a pull request.
   *
   * Submits a pending review for a pull request. For more information about creating a pending review for a pull request, see "[Create a review for a pull request](https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsSubmitReview$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsSubmitReview(params: PullsSubmitReview$Params, context?: HttpContext): Observable<PullRequestReview> {
    return this.pullsSubmitReview$Response(params, context).pipe(
      map((r: StrictHttpResponse<PullRequestReview>): PullRequestReview => r.body)
    );
  }

  /** Path part for operation `pullsUpdateBranch()` */
  static readonly PullsUpdateBranchPath = '/repos/{owner}/{repo}/pulls/{pull_number}/update-branch';

  /**
   * Update a pull request branch.
   *
   * Updates the pull request branch with the latest upstream changes by merging HEAD from the base branch into the pull request branch.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `pullsUpdateBranch()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateBranch$Response(params: PullsUpdateBranch$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'message'?: string;
'url'?: string;
}>> {
    return pullsUpdateBranch(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a pull request branch.
   *
   * Updates the pull request branch with the latest upstream changes by merging HEAD from the base branch into the pull request branch.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `pullsUpdateBranch$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  pullsUpdateBranch(params: PullsUpdateBranch$Params, context?: HttpContext): Observable<{
'message'?: string;
'url'?: string;
}> {
    return this.pullsUpdateBranch$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'message'?: string;
'url'?: string;
}>): {
'message'?: string;
'url'?: string;
} => r.body)
    );
  }

}
