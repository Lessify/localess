/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Reaction } from '../models/reaction';
import { reactionsCreateForCommitComment } from '../fn/reactions/reactions-create-for-commit-comment';
import { ReactionsCreateForCommitComment$Params } from '../fn/reactions/reactions-create-for-commit-comment';
import { reactionsCreateForIssue } from '../fn/reactions/reactions-create-for-issue';
import { ReactionsCreateForIssue$Params } from '../fn/reactions/reactions-create-for-issue';
import { reactionsCreateForIssueComment } from '../fn/reactions/reactions-create-for-issue-comment';
import { ReactionsCreateForIssueComment$Params } from '../fn/reactions/reactions-create-for-issue-comment';
import { reactionsCreateForPullRequestReviewComment } from '../fn/reactions/reactions-create-for-pull-request-review-comment';
import { ReactionsCreateForPullRequestReviewComment$Params } from '../fn/reactions/reactions-create-for-pull-request-review-comment';
import { reactionsCreateForRelease } from '../fn/reactions/reactions-create-for-release';
import { ReactionsCreateForRelease$Params } from '../fn/reactions/reactions-create-for-release';
import { reactionsCreateForTeamDiscussionCommentInOrg } from '../fn/reactions/reactions-create-for-team-discussion-comment-in-org';
import { ReactionsCreateForTeamDiscussionCommentInOrg$Params } from '../fn/reactions/reactions-create-for-team-discussion-comment-in-org';
import { reactionsCreateForTeamDiscussionCommentLegacy } from '../fn/reactions/reactions-create-for-team-discussion-comment-legacy';
import { ReactionsCreateForTeamDiscussionCommentLegacy$Params } from '../fn/reactions/reactions-create-for-team-discussion-comment-legacy';
import { reactionsCreateForTeamDiscussionInOrg } from '../fn/reactions/reactions-create-for-team-discussion-in-org';
import { ReactionsCreateForTeamDiscussionInOrg$Params } from '../fn/reactions/reactions-create-for-team-discussion-in-org';
import { reactionsCreateForTeamDiscussionLegacy } from '../fn/reactions/reactions-create-for-team-discussion-legacy';
import { ReactionsCreateForTeamDiscussionLegacy$Params } from '../fn/reactions/reactions-create-for-team-discussion-legacy';
import { reactionsDeleteForCommitComment } from '../fn/reactions/reactions-delete-for-commit-comment';
import { ReactionsDeleteForCommitComment$Params } from '../fn/reactions/reactions-delete-for-commit-comment';
import { reactionsDeleteForIssue } from '../fn/reactions/reactions-delete-for-issue';
import { ReactionsDeleteForIssue$Params } from '../fn/reactions/reactions-delete-for-issue';
import { reactionsDeleteForIssueComment } from '../fn/reactions/reactions-delete-for-issue-comment';
import { ReactionsDeleteForIssueComment$Params } from '../fn/reactions/reactions-delete-for-issue-comment';
import { reactionsDeleteForPullRequestComment } from '../fn/reactions/reactions-delete-for-pull-request-comment';
import { ReactionsDeleteForPullRequestComment$Params } from '../fn/reactions/reactions-delete-for-pull-request-comment';
import { reactionsDeleteForRelease } from '../fn/reactions/reactions-delete-for-release';
import { ReactionsDeleteForRelease$Params } from '../fn/reactions/reactions-delete-for-release';
import { reactionsDeleteForTeamDiscussion } from '../fn/reactions/reactions-delete-for-team-discussion';
import { ReactionsDeleteForTeamDiscussion$Params } from '../fn/reactions/reactions-delete-for-team-discussion';
import { reactionsDeleteForTeamDiscussionComment } from '../fn/reactions/reactions-delete-for-team-discussion-comment';
import { ReactionsDeleteForTeamDiscussionComment$Params } from '../fn/reactions/reactions-delete-for-team-discussion-comment';
import { reactionsListForCommitComment } from '../fn/reactions/reactions-list-for-commit-comment';
import { ReactionsListForCommitComment$Params } from '../fn/reactions/reactions-list-for-commit-comment';
import { reactionsListForIssue } from '../fn/reactions/reactions-list-for-issue';
import { ReactionsListForIssue$Params } from '../fn/reactions/reactions-list-for-issue';
import { reactionsListForIssueComment } from '../fn/reactions/reactions-list-for-issue-comment';
import { ReactionsListForIssueComment$Params } from '../fn/reactions/reactions-list-for-issue-comment';
import { reactionsListForPullRequestReviewComment } from '../fn/reactions/reactions-list-for-pull-request-review-comment';
import { ReactionsListForPullRequestReviewComment$Params } from '../fn/reactions/reactions-list-for-pull-request-review-comment';
import { reactionsListForRelease } from '../fn/reactions/reactions-list-for-release';
import { ReactionsListForRelease$Params } from '../fn/reactions/reactions-list-for-release';
import { reactionsListForTeamDiscussionCommentInOrg } from '../fn/reactions/reactions-list-for-team-discussion-comment-in-org';
import { ReactionsListForTeamDiscussionCommentInOrg$Params } from '../fn/reactions/reactions-list-for-team-discussion-comment-in-org';
import { reactionsListForTeamDiscussionCommentLegacy } from '../fn/reactions/reactions-list-for-team-discussion-comment-legacy';
import { ReactionsListForTeamDiscussionCommentLegacy$Params } from '../fn/reactions/reactions-list-for-team-discussion-comment-legacy';
import { reactionsListForTeamDiscussionInOrg } from '../fn/reactions/reactions-list-for-team-discussion-in-org';
import { ReactionsListForTeamDiscussionInOrg$Params } from '../fn/reactions/reactions-list-for-team-discussion-in-org';
import { reactionsListForTeamDiscussionLegacy } from '../fn/reactions/reactions-list-for-team-discussion-legacy';
import { ReactionsListForTeamDiscussionLegacy$Params } from '../fn/reactions/reactions-list-for-team-discussion-legacy';


/**
 * Interact with reactions to various GitHub entities.
 */
@Injectable({ providedIn: 'root' })
export class ReactionsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `reactionsListForTeamDiscussionCommentInOrg()` */
  static readonly ReactionsListForTeamDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions';

  /**
   * List reactions for a team discussion comment.
   *
   * List the reactions to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForTeamDiscussionCommentInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForTeamDiscussionCommentInOrg$Response(params: ReactionsListForTeamDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForTeamDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a team discussion comment.
   *
   * List the reactions to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForTeamDiscussionCommentInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForTeamDiscussionCommentInOrg(params: ReactionsListForTeamDiscussionCommentInOrg$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForTeamDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForTeamDiscussionCommentInOrg()` */
  static readonly ReactionsCreateForTeamDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions';

  /**
   * Create reaction for a team discussion comment.
   *
   * Create a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion comment.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForTeamDiscussionCommentInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForTeamDiscussionCommentInOrg$Response(params: ReactionsCreateForTeamDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForTeamDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a team discussion comment.
   *
   * Create a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion comment.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForTeamDiscussionCommentInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForTeamDiscussionCommentInOrg(params: ReactionsCreateForTeamDiscussionCommentInOrg$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForTeamDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForTeamDiscussionComment()` */
  static readonly ReactionsDeleteForTeamDiscussionCommentPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}';

  /**
   * Delete team discussion comment reaction.
   *
   * **Note:** You can also specify a team or organization with `team_id` and `org_id` using the route `DELETE /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions/:reaction_id`.
   *
   * Delete a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForTeamDiscussionComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForTeamDiscussionComment$Response(params: ReactionsDeleteForTeamDiscussionComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForTeamDiscussionComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete team discussion comment reaction.
   *
   * **Note:** You can also specify a team or organization with `team_id` and `org_id` using the route `DELETE /organizations/:org_id/team/:team_id/discussions/:discussion_number/comments/:comment_number/reactions/:reaction_id`.
   *
   * Delete a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForTeamDiscussionComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForTeamDiscussionComment(params: ReactionsDeleteForTeamDiscussionComment$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForTeamDiscussionComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForTeamDiscussionInOrg()` */
  static readonly ReactionsListForTeamDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions';

  /**
   * List reactions for a team discussion.
   *
   * List the reactions to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForTeamDiscussionInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForTeamDiscussionInOrg$Response(params: ReactionsListForTeamDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForTeamDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a team discussion.
   *
   * List the reactions to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForTeamDiscussionInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForTeamDiscussionInOrg(params: ReactionsListForTeamDiscussionInOrg$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForTeamDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForTeamDiscussionInOrg()` */
  static readonly ReactionsCreateForTeamDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions';

  /**
   * Create reaction for a team discussion.
   *
   * Create a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForTeamDiscussionInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForTeamDiscussionInOrg$Response(params: ReactionsCreateForTeamDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForTeamDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a team discussion.
   *
   * Create a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForTeamDiscussionInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForTeamDiscussionInOrg(params: ReactionsCreateForTeamDiscussionInOrg$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForTeamDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForTeamDiscussion()` */
  static readonly ReactionsDeleteForTeamDiscussionPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}';

  /**
   * Delete team discussion reaction.
   *
   * **Note:** You can also specify a team or organization with `team_id` and `org_id` using the route `DELETE /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions/:reaction_id`.
   *
   * Delete a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForTeamDiscussion()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForTeamDiscussion$Response(params: ReactionsDeleteForTeamDiscussion$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForTeamDiscussion(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete team discussion reaction.
   *
   * **Note:** You can also specify a team or organization with `team_id` and `org_id` using the route `DELETE /organizations/:org_id/team/:team_id/discussions/:discussion_number/reactions/:reaction_id`.
   *
   * Delete a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForTeamDiscussion$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForTeamDiscussion(params: ReactionsDeleteForTeamDiscussion$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForTeamDiscussion$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForCommitComment()` */
  static readonly ReactionsListForCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}/reactions';

  /**
   * List reactions for a commit comment.
   *
   * List the reactions to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForCommitComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForCommitComment$Response(params: ReactionsListForCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a commit comment.
   *
   * List the reactions to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForCommitComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForCommitComment(params: ReactionsListForCommitComment$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForCommitComment()` */
  static readonly ReactionsCreateForCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}/reactions';

  /**
   * Create reaction for a commit comment.
   *
   * Create a reaction to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment). A response with an HTTP `200` status means that you already added the reaction type to this commit comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForCommitComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForCommitComment$Response(params: ReactionsCreateForCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a commit comment.
   *
   * Create a reaction to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment). A response with an HTTP `200` status means that you already added the reaction type to this commit comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForCommitComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForCommitComment(params: ReactionsCreateForCommitComment$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForCommitComment()` */
  static readonly ReactionsDeleteForCommitCommentPath = '/repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}';

  /**
   * Delete a commit comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/comments/:comment_id/reactions/:reaction_id`.
   *
   * Delete a reaction to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForCommitComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForCommitComment$Response(params: ReactionsDeleteForCommitComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForCommitComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a commit comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/comments/:comment_id/reactions/:reaction_id`.
   *
   * Delete a reaction to a [commit comment](https://docs.github.com/rest/commits/comments#get-a-commit-comment).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForCommitComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForCommitComment(params: ReactionsDeleteForCommitComment$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForCommitComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForIssueComment()` */
  static readonly ReactionsListForIssueCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions';

  /**
   * List reactions for an issue comment.
   *
   * List the reactions to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForIssueComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForIssueComment$Response(params: ReactionsListForIssueComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForIssueComment(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for an issue comment.
   *
   * List the reactions to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForIssueComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForIssueComment(params: ReactionsListForIssueComment$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForIssueComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForIssueComment()` */
  static readonly ReactionsCreateForIssueCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions';

  /**
   * Create reaction for an issue comment.
   *
   * Create a reaction to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment). A response with an HTTP `200` status means that you already added the reaction type to this issue comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForIssueComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForIssueComment$Response(params: ReactionsCreateForIssueComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForIssueComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for an issue comment.
   *
   * Create a reaction to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment). A response with an HTTP `200` status means that you already added the reaction type to this issue comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForIssueComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForIssueComment(params: ReactionsCreateForIssueComment$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForIssueComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForIssueComment()` */
  static readonly ReactionsDeleteForIssueCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}';

  /**
   * Delete an issue comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE delete /repositories/:repository_id/issues/comments/:comment_id/reactions/:reaction_id`.
   *
   * Delete a reaction to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForIssueComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForIssueComment$Response(params: ReactionsDeleteForIssueComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForIssueComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an issue comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE delete /repositories/:repository_id/issues/comments/:comment_id/reactions/:reaction_id`.
   *
   * Delete a reaction to an [issue comment](https://docs.github.com/rest/issues/comments#get-an-issue-comment).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForIssueComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForIssueComment(params: ReactionsDeleteForIssueComment$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForIssueComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForIssue()` */
  static readonly ReactionsListForIssuePath = '/repos/{owner}/{repo}/issues/{issue_number}/reactions';

  /**
   * List reactions for an issue.
   *
   * List the reactions to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForIssue()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForIssue$Response(params: ReactionsListForIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForIssue(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for an issue.
   *
   * List the reactions to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForIssue$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForIssue(params: ReactionsListForIssue$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForIssue$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForIssue()` */
  static readonly ReactionsCreateForIssuePath = '/repos/{owner}/{repo}/issues/{issue_number}/reactions';

  /**
   * Create reaction for an issue.
   *
   * Create a reaction to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue). A response with an HTTP `200` status means that you already added the reaction type to this issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForIssue()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForIssue$Response(params: ReactionsCreateForIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForIssue(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for an issue.
   *
   * Create a reaction to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue). A response with an HTTP `200` status means that you already added the reaction type to this issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForIssue$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForIssue(params: ReactionsCreateForIssue$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForIssue$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForIssue()` */
  static readonly ReactionsDeleteForIssuePath = '/repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}';

  /**
   * Delete an issue reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/issues/:issue_number/reactions/:reaction_id`.
   *
   * Delete a reaction to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForIssue()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForIssue$Response(params: ReactionsDeleteForIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForIssue(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an issue reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/issues/:issue_number/reactions/:reaction_id`.
   *
   * Delete a reaction to an [issue](https://docs.github.com/rest/issues/issues#get-an-issue).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForIssue$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForIssue(params: ReactionsDeleteForIssue$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForIssue$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForPullRequestReviewComment()` */
  static readonly ReactionsListForPullRequestReviewCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions';

  /**
   * List reactions for a pull request review comment.
   *
   * List the reactions to a [pull request review comment](https://docs.github.com/pulls/comments#get-a-review-comment-for-a-pull-request).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForPullRequestReviewComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForPullRequestReviewComment$Response(params: ReactionsListForPullRequestReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForPullRequestReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a pull request review comment.
   *
   * List the reactions to a [pull request review comment](https://docs.github.com/pulls/comments#get-a-review-comment-for-a-pull-request).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForPullRequestReviewComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForPullRequestReviewComment(params: ReactionsListForPullRequestReviewComment$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForPullRequestReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForPullRequestReviewComment()` */
  static readonly ReactionsCreateForPullRequestReviewCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions';

  /**
   * Create reaction for a pull request review comment.
   *
   * Create a reaction to a [pull request review comment](https://docs.github.com/rest/pulls/comments#get-a-review-comment-for-a-pull-request). A response with an HTTP `200` status means that you already added the reaction type to this pull request review comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForPullRequestReviewComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForPullRequestReviewComment$Response(params: ReactionsCreateForPullRequestReviewComment$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForPullRequestReviewComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a pull request review comment.
   *
   * Create a reaction to a [pull request review comment](https://docs.github.com/rest/pulls/comments#get-a-review-comment-for-a-pull-request). A response with an HTTP `200` status means that you already added the reaction type to this pull request review comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForPullRequestReviewComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForPullRequestReviewComment(params: ReactionsCreateForPullRequestReviewComment$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForPullRequestReviewComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForPullRequestComment()` */
  static readonly ReactionsDeleteForPullRequestCommentPath = '/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}';

  /**
   * Delete a pull request comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/pulls/comments/:comment_id/reactions/:reaction_id.`
   *
   * Delete a reaction to a [pull request review comment](https://docs.github.com/rest/pulls/comments#get-a-review-comment-for-a-pull-request).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForPullRequestComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForPullRequestComment$Response(params: ReactionsDeleteForPullRequestComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForPullRequestComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a pull request comment reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE /repositories/:repository_id/pulls/comments/:comment_id/reactions/:reaction_id.`
   *
   * Delete a reaction to a [pull request review comment](https://docs.github.com/rest/pulls/comments#get-a-review-comment-for-a-pull-request).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForPullRequestComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForPullRequestComment(params: ReactionsDeleteForPullRequestComment$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForPullRequestComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForRelease()` */
  static readonly ReactionsListForReleasePath = '/repos/{owner}/{repo}/releases/{release_id}/reactions';

  /**
   * List reactions for a release.
   *
   * List the reactions to a [release](https://docs.github.com/rest/releases/releases#get-a-release).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForRelease()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForRelease$Response(params: ReactionsListForRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a release.
   *
   * List the reactions to a [release](https://docs.github.com/rest/releases/releases#get-a-release).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForRelease$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsListForRelease(params: ReactionsListForRelease$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForRelease()` */
  static readonly ReactionsCreateForReleasePath = '/repos/{owner}/{repo}/releases/{release_id}/reactions';

  /**
   * Create reaction for a release.
   *
   * Create a reaction to a [release](https://docs.github.com/rest/releases/releases#get-a-release). A response with a `Status: 200 OK` means that you already added the reaction type to this release.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForRelease()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForRelease$Response(params: ReactionsCreateForRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a release.
   *
   * Create a reaction to a [release](https://docs.github.com/rest/releases/releases#get-a-release). A response with a `Status: 200 OK` means that you already added the reaction type to this release.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForRelease$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  reactionsCreateForRelease(params: ReactionsCreateForRelease$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsDeleteForRelease()` */
  static readonly ReactionsDeleteForReleasePath = '/repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}';

  /**
   * Delete a release reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE delete /repositories/:repository_id/releases/:release_id/reactions/:reaction_id`.
   *
   * Delete a reaction to a [release](https://docs.github.com/rest/releases/releases#get-a-release).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsDeleteForRelease()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForRelease$Response(params: ReactionsDeleteForRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return reactionsDeleteForRelease(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a release reaction.
   *
   * **Note:** You can also specify a repository by `repository_id` using the route `DELETE delete /repositories/:repository_id/releases/:release_id/reactions/:reaction_id`.
   *
   * Delete a reaction to a [release](https://docs.github.com/rest/releases/releases#get-a-release).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsDeleteForRelease$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  reactionsDeleteForRelease(params: ReactionsDeleteForRelease$Params, context?: HttpContext): Observable<void> {
    return this.reactionsDeleteForRelease$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `reactionsListForTeamDiscussionCommentLegacy()` */
  static readonly ReactionsListForTeamDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions';

  /**
   * List reactions for a team discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List reactions for a team discussion comment`](https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion-comment) endpoint.
   *
   * List the reactions to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForTeamDiscussionCommentLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  reactionsListForTeamDiscussionCommentLegacy$Response(params: ReactionsListForTeamDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForTeamDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a team discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List reactions for a team discussion comment`](https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion-comment) endpoint.
   *
   * List the reactions to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForTeamDiscussionCommentLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  reactionsListForTeamDiscussionCommentLegacy(params: ReactionsListForTeamDiscussionCommentLegacy$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForTeamDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForTeamDiscussionCommentLegacy()` */
  static readonly ReactionsCreateForTeamDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions';

  /**
   * Create reaction for a team discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new "[Create reaction for a team discussion comment](https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion-comment)" endpoint.
   *
   * Create a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion comment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForTeamDiscussionCommentLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  reactionsCreateForTeamDiscussionCommentLegacy$Response(params: ReactionsCreateForTeamDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForTeamDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a team discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new "[Create reaction for a team discussion comment](https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion-comment)" endpoint.
   *
   * Create a reaction to a [team discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion comment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForTeamDiscussionCommentLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  reactionsCreateForTeamDiscussionCommentLegacy(params: ReactionsCreateForTeamDiscussionCommentLegacy$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForTeamDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

  /** Path part for operation `reactionsListForTeamDiscussionLegacy()` */
  static readonly ReactionsListForTeamDiscussionLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/reactions';

  /**
   * List reactions for a team discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List reactions for a team discussion`](https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion) endpoint.
   *
   * List the reactions to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsListForTeamDiscussionLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  reactionsListForTeamDiscussionLegacy$Response(params: ReactionsListForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
    return reactionsListForTeamDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List reactions for a team discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List reactions for a team discussion`](https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion) endpoint.
   *
   * List the reactions to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsListForTeamDiscussionLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  reactionsListForTeamDiscussionLegacy(params: ReactionsListForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<Array<Reaction>> {
    return this.reactionsListForTeamDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Reaction>>): Array<Reaction> => r.body)
    );
  }

  /** Path part for operation `reactionsCreateForTeamDiscussionLegacy()` */
  static readonly ReactionsCreateForTeamDiscussionLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/reactions';

  /**
   * Create reaction for a team discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Create reaction for a team discussion`](https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion) endpoint.
   *
   * Create a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `reactionsCreateForTeamDiscussionLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  reactionsCreateForTeamDiscussionLegacy$Response(params: ReactionsCreateForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
    return reactionsCreateForTeamDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Create reaction for a team discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Create reaction for a team discussion`](https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion) endpoint.
   *
   * Create a reaction to a [team discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion). OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/). A response with an HTTP `200` status means that you already added the reaction type to this team discussion.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `reactionsCreateForTeamDiscussionLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  reactionsCreateForTeamDiscussionLegacy(params: ReactionsCreateForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<Reaction> {
    return this.reactionsCreateForTeamDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Reaction>): Reaction => r.body)
    );
  }

}
