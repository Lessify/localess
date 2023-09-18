/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Issue } from '../models/issue';
import { IssueComment } from '../models/issue-comment';
import { IssueEvent } from '../models/issue-event';
import { IssueEventForIssue } from '../models/issue-event-for-issue';
import { issuesAddAssignees } from '../fn/issues/issues-add-assignees';
import { IssuesAddAssignees$Params } from '../fn/issues/issues-add-assignees';
import { issuesAddLabels } from '../fn/issues/issues-add-labels';
import { IssuesAddLabels$Params } from '../fn/issues/issues-add-labels';
import { issuesCheckUserCanBeAssigned } from '../fn/issues/issues-check-user-can-be-assigned';
import { IssuesCheckUserCanBeAssigned$Params } from '../fn/issues/issues-check-user-can-be-assigned';
import { issuesCheckUserCanBeAssignedToIssue } from '../fn/issues/issues-check-user-can-be-assigned-to-issue';
import { IssuesCheckUserCanBeAssignedToIssue$Params } from '../fn/issues/issues-check-user-can-be-assigned-to-issue';
import { issuesCreate } from '../fn/issues/issues-create';
import { IssuesCreate$Params } from '../fn/issues/issues-create';
import { issuesCreateComment } from '../fn/issues/issues-create-comment';
import { IssuesCreateComment$Params } from '../fn/issues/issues-create-comment';
import { issuesCreateLabel } from '../fn/issues/issues-create-label';
import { IssuesCreateLabel$Params } from '../fn/issues/issues-create-label';
import { issuesCreateMilestone } from '../fn/issues/issues-create-milestone';
import { IssuesCreateMilestone$Params } from '../fn/issues/issues-create-milestone';
import { issuesDeleteComment } from '../fn/issues/issues-delete-comment';
import { IssuesDeleteComment$Params } from '../fn/issues/issues-delete-comment';
import { issuesDeleteLabel } from '../fn/issues/issues-delete-label';
import { IssuesDeleteLabel$Params } from '../fn/issues/issues-delete-label';
import { issuesDeleteMilestone } from '../fn/issues/issues-delete-milestone';
import { IssuesDeleteMilestone$Params } from '../fn/issues/issues-delete-milestone';
import { issuesGet } from '../fn/issues/issues-get';
import { IssuesGet$Params } from '../fn/issues/issues-get';
import { issuesGetComment } from '../fn/issues/issues-get-comment';
import { IssuesGetComment$Params } from '../fn/issues/issues-get-comment';
import { issuesGetEvent } from '../fn/issues/issues-get-event';
import { IssuesGetEvent$Params } from '../fn/issues/issues-get-event';
import { issuesGetLabel } from '../fn/issues/issues-get-label';
import { IssuesGetLabel$Params } from '../fn/issues/issues-get-label';
import { issuesGetMilestone } from '../fn/issues/issues-get-milestone';
import { IssuesGetMilestone$Params } from '../fn/issues/issues-get-milestone';
import { issuesList } from '../fn/issues/issues-list';
import { IssuesList$Params } from '../fn/issues/issues-list';
import { issuesListAssignees } from '../fn/issues/issues-list-assignees';
import { IssuesListAssignees$Params } from '../fn/issues/issues-list-assignees';
import { issuesListComments } from '../fn/issues/issues-list-comments';
import { IssuesListComments$Params } from '../fn/issues/issues-list-comments';
import { issuesListCommentsForRepo } from '../fn/issues/issues-list-comments-for-repo';
import { IssuesListCommentsForRepo$Params } from '../fn/issues/issues-list-comments-for-repo';
import { issuesListEvents } from '../fn/issues/issues-list-events';
import { IssuesListEvents$Params } from '../fn/issues/issues-list-events';
import { issuesListEventsForRepo } from '../fn/issues/issues-list-events-for-repo';
import { IssuesListEventsForRepo$Params } from '../fn/issues/issues-list-events-for-repo';
import { issuesListEventsForTimeline } from '../fn/issues/issues-list-events-for-timeline';
import { IssuesListEventsForTimeline$Params } from '../fn/issues/issues-list-events-for-timeline';
import { issuesListForAuthenticatedUser } from '../fn/issues/issues-list-for-authenticated-user';
import { IssuesListForAuthenticatedUser$Params } from '../fn/issues/issues-list-for-authenticated-user';
import { issuesListForOrg } from '../fn/issues/issues-list-for-org';
import { IssuesListForOrg$Params } from '../fn/issues/issues-list-for-org';
import { issuesListForRepo } from '../fn/issues/issues-list-for-repo';
import { IssuesListForRepo$Params } from '../fn/issues/issues-list-for-repo';
import { issuesListLabelsForMilestone } from '../fn/issues/issues-list-labels-for-milestone';
import { IssuesListLabelsForMilestone$Params } from '../fn/issues/issues-list-labels-for-milestone';
import { issuesListLabelsForRepo } from '../fn/issues/issues-list-labels-for-repo';
import { IssuesListLabelsForRepo$Params } from '../fn/issues/issues-list-labels-for-repo';
import { issuesListLabelsOnIssue } from '../fn/issues/issues-list-labels-on-issue';
import { IssuesListLabelsOnIssue$Params } from '../fn/issues/issues-list-labels-on-issue';
import { issuesListMilestones } from '../fn/issues/issues-list-milestones';
import { IssuesListMilestones$Params } from '../fn/issues/issues-list-milestones';
import { issuesLock } from '../fn/issues/issues-lock';
import { IssuesLock$Params } from '../fn/issues/issues-lock';
import { issuesRemoveAllLabels } from '../fn/issues/issues-remove-all-labels';
import { IssuesRemoveAllLabels$Params } from '../fn/issues/issues-remove-all-labels';
import { issuesRemoveAssignees } from '../fn/issues/issues-remove-assignees';
import { IssuesRemoveAssignees$Params } from '../fn/issues/issues-remove-assignees';
import { issuesRemoveLabel } from '../fn/issues/issues-remove-label';
import { IssuesRemoveLabel$Params } from '../fn/issues/issues-remove-label';
import { issuesSetLabels } from '../fn/issues/issues-set-labels';
import { IssuesSetLabels$Params } from '../fn/issues/issues-set-labels';
import { issuesUnlock } from '../fn/issues/issues-unlock';
import { IssuesUnlock$Params } from '../fn/issues/issues-unlock';
import { issuesUpdate } from '../fn/issues/issues-update';
import { IssuesUpdate$Params } from '../fn/issues/issues-update';
import { issuesUpdateComment } from '../fn/issues/issues-update-comment';
import { IssuesUpdateComment$Params } from '../fn/issues/issues-update-comment';
import { issuesUpdateLabel } from '../fn/issues/issues-update-label';
import { IssuesUpdateLabel$Params } from '../fn/issues/issues-update-label';
import { issuesUpdateMilestone } from '../fn/issues/issues-update-milestone';
import { IssuesUpdateMilestone$Params } from '../fn/issues/issues-update-milestone';
import { Label } from '../models/label';
import { Milestone } from '../models/milestone';
import { SimpleUser } from '../models/simple-user';
import { TimelineIssueEvents } from '../models/timeline-issue-events';


/**
 * Interact with GitHub Issues.
 */
@Injectable({ providedIn: 'root' })
export class IssuesService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `issuesList()` */
  static readonly IssuesListPath = '/issues';

  /**
   * List issues assigned to the authenticated user.
   *
   * List issues assigned to the authenticated user across all visible repositories including owned repositories, member
   * repositories, and organization repositories. You can use the `filter` query parameter to fetch issues that are not
   * necessarily assigned to you.
   *
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesList()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesList$Response(params?: IssuesList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
    return issuesList(this.http, this.rootUrl, params, context);
  }

  /**
   * List issues assigned to the authenticated user.
   *
   * List issues assigned to the authenticated user across all visible repositories including owned repositories, member
   * repositories, and organization repositories. You can use the `filter` query parameter to fetch issues that are not
   * necessarily assigned to you.
   *
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesList(params?: IssuesList$Params, context?: HttpContext): Observable<Array<Issue>> {
    return this.issuesList$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Issue>>): Array<Issue> => r.body)
    );
  }

  /** Path part for operation `issuesListForOrg()` */
  static readonly IssuesListForOrgPath = '/orgs/{org}/issues';

  /**
   * List organization issues assigned to the authenticated user.
   *
   * List issues in an organization assigned to the authenticated user.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForOrg$Response(params: IssuesListForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
    return issuesListForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization issues assigned to the authenticated user.
   *
   * List issues in an organization assigned to the authenticated user.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForOrg(params: IssuesListForOrg$Params, context?: HttpContext): Observable<Array<Issue>> {
    return this.issuesListForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Issue>>): Array<Issue> => r.body)
    );
  }

  /** Path part for operation `issuesListAssignees()` */
  static readonly IssuesListAssigneesPath = '/repos/{owner}/{repo}/assignees';

  /**
   * List assignees.
   *
   * Lists the [available assignees](https://docs.github.com/articles/assigning-issues-and-pull-requests-to-other-github-users/) for issues in a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListAssignees()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListAssignees$Response(params: IssuesListAssignees$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return issuesListAssignees(this.http, this.rootUrl, params, context);
  }

  /**
   * List assignees.
   *
   * Lists the [available assignees](https://docs.github.com/articles/assigning-issues-and-pull-requests-to-other-github-users/) for issues in a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListAssignees$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListAssignees(params: IssuesListAssignees$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.issuesListAssignees$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `issuesCheckUserCanBeAssigned()` */
  static readonly IssuesCheckUserCanBeAssignedPath = '/repos/{owner}/{repo}/assignees/{assignee}';

  /**
   * Check if a user can be assigned.
   *
   * Checks if a user has permission to be assigned to an issue in this repository.
   *
   * If the `assignee` can be assigned to issues in the repository, a `204` header with no content is returned.
   *
   * Otherwise a `404` status code is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCheckUserCanBeAssigned()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesCheckUserCanBeAssigned$Response(params: IssuesCheckUserCanBeAssigned$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesCheckUserCanBeAssigned(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a user can be assigned.
   *
   * Checks if a user has permission to be assigned to an issue in this repository.
   *
   * If the `assignee` can be assigned to issues in the repository, a `204` header with no content is returned.
   *
   * Otherwise a `404` status code is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCheckUserCanBeAssigned$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesCheckUserCanBeAssigned(params: IssuesCheckUserCanBeAssigned$Params, context?: HttpContext): Observable<void> {
    return this.issuesCheckUserCanBeAssigned$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesListForRepo()` */
  static readonly IssuesListForRepoPath = '/repos/{owner}/{repo}/issues';

  /**
   * List repository issues.
   *
   * List issues in a repository. Only open issues will be listed.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForRepo$Response(params: IssuesListForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
    return issuesListForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository issues.
   *
   * List issues in a repository. Only open issues will be listed.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForRepo(params: IssuesListForRepo$Params, context?: HttpContext): Observable<Array<Issue>> {
    return this.issuesListForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Issue>>): Array<Issue> => r.body)
    );
  }

  /** Path part for operation `issuesCreate()` */
  static readonly IssuesCreatePath = '/repos/{owner}/{repo}/issues';

  /**
   * Create an issue.
   *
   * Any user with pull access to a repository can create an issue. If [issues are disabled in the repository](https://docs.github.com/articles/disabling-issues/), the API returns a `410 Gone` status.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCreate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreate$Response(params: IssuesCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
    return issuesCreate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an issue.
   *
   * Any user with pull access to a repository can create an issue. If [issues are disabled in the repository](https://docs.github.com/articles/disabling-issues/), the API returns a `410 Gone` status.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCreate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreate(params: IssuesCreate$Params, context?: HttpContext): Observable<Issue> {
    return this.issuesCreate$Response(params, context).pipe(
      map((r: StrictHttpResponse<Issue>): Issue => r.body)
    );
  }

  /** Path part for operation `issuesListCommentsForRepo()` */
  static readonly IssuesListCommentsForRepoPath = '/repos/{owner}/{repo}/issues/comments';

  /**
   * List issue comments for a repository.
   *
   * You can use the REST API to list comments on issues and pull requests for a repository. Every pull request is an issue, but not every issue is a pull request.
   *
   * By default, issue comments are ordered by ascending ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListCommentsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListCommentsForRepo$Response(params: IssuesListCommentsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<IssueComment>>> {
    return issuesListCommentsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List issue comments for a repository.
   *
   * You can use the REST API to list comments on issues and pull requests for a repository. Every pull request is an issue, but not every issue is a pull request.
   *
   * By default, issue comments are ordered by ascending ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListCommentsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListCommentsForRepo(params: IssuesListCommentsForRepo$Params, context?: HttpContext): Observable<Array<IssueComment>> {
    return this.issuesListCommentsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<IssueComment>>): Array<IssueComment> => r.body)
    );
  }

  /** Path part for operation `issuesGetComment()` */
  static readonly IssuesGetCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}';

  /**
   * Get an issue comment.
   *
   * You can use the REST API to get comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesGetComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetComment$Response(params: IssuesGetComment$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueComment>> {
    return issuesGetComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an issue comment.
   *
   * You can use the REST API to get comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesGetComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetComment(params: IssuesGetComment$Params, context?: HttpContext): Observable<IssueComment> {
    return this.issuesGetComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<IssueComment>): IssueComment => r.body)
    );
  }

  /** Path part for operation `issuesDeleteComment()` */
  static readonly IssuesDeleteCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}';

  /**
   * Delete an issue comment.
   *
   * You can use the REST API to delete comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesDeleteComment()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteComment$Response(params: IssuesDeleteComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesDeleteComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an issue comment.
   *
   * You can use the REST API to delete comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesDeleteComment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteComment(params: IssuesDeleteComment$Params, context?: HttpContext): Observable<void> {
    return this.issuesDeleteComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesUpdateComment()` */
  static readonly IssuesUpdateCommentPath = '/repos/{owner}/{repo}/issues/comments/{comment_id}';

  /**
   * Update an issue comment.
   *
   * You can use the REST API to update comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesUpdateComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateComment$Response(params: IssuesUpdateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueComment>> {
    return issuesUpdateComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an issue comment.
   *
   * You can use the REST API to update comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesUpdateComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateComment(params: IssuesUpdateComment$Params, context?: HttpContext): Observable<IssueComment> {
    return this.issuesUpdateComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<IssueComment>): IssueComment => r.body)
    );
  }

  /** Path part for operation `issuesListEventsForRepo()` */
  static readonly IssuesListEventsForRepoPath = '/repos/{owner}/{repo}/issues/events';

  /**
   * List issue events for a repository.
   *
   * Lists events for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListEventsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEventsForRepo$Response(params: IssuesListEventsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<IssueEvent>>> {
    return issuesListEventsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List issue events for a repository.
   *
   * Lists events for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListEventsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEventsForRepo(params: IssuesListEventsForRepo$Params, context?: HttpContext): Observable<Array<IssueEvent>> {
    return this.issuesListEventsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<IssueEvent>>): Array<IssueEvent> => r.body)
    );
  }

  /** Path part for operation `issuesGetEvent()` */
  static readonly IssuesGetEventPath = '/repos/{owner}/{repo}/issues/events/{event_id}';

  /**
   * Get an issue event.
   *
   * Gets a single event by the event id.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesGetEvent()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetEvent$Response(params: IssuesGetEvent$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueEvent>> {
    return issuesGetEvent(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an issue event.
   *
   * Gets a single event by the event id.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesGetEvent$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetEvent(params: IssuesGetEvent$Params, context?: HttpContext): Observable<IssueEvent> {
    return this.issuesGetEvent$Response(params, context).pipe(
      map((r: StrictHttpResponse<IssueEvent>): IssueEvent => r.body)
    );
  }

  /** Path part for operation `issuesGet()` */
  static readonly IssuesGetPath = '/repos/{owner}/{repo}/issues/{issue_number}';

  /**
   * Get an issue.
   *
   * The API returns a [`301 Moved Permanently` status](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-redirects-redirects) if the issue was
   * [transferred](https://docs.github.com/articles/transferring-an-issue-to-another-repository/) to another repository. If
   * the issue was transferred to or deleted from a repository where the authenticated user lacks read access, the API
   * returns a `404 Not Found` status. If the issue was deleted from a repository where the authenticated user has read
   * access, the API returns a `410 Gone` status. To receive webhook events for transferred and deleted issues, subscribe
   * to the [`issues`](https://docs.github.com/webhooks/event-payloads/#issues) webhook.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGet$Response(params: IssuesGet$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
    return issuesGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an issue.
   *
   * The API returns a [`301 Moved Permanently` status](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-redirects-redirects) if the issue was
   * [transferred](https://docs.github.com/articles/transferring-an-issue-to-another-repository/) to another repository. If
   * the issue was transferred to or deleted from a repository where the authenticated user lacks read access, the API
   * returns a `404 Not Found` status. If the issue was deleted from a repository where the authenticated user has read
   * access, the API returns a `410 Gone` status. To receive webhook events for transferred and deleted issues, subscribe
   * to the [`issues`](https://docs.github.com/webhooks/event-payloads/#issues) webhook.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGet(params: IssuesGet$Params, context?: HttpContext): Observable<Issue> {
    return this.issuesGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<Issue>): Issue => r.body)
    );
  }

  /** Path part for operation `issuesUpdate()` */
  static readonly IssuesUpdatePath = '/repos/{owner}/{repo}/issues/{issue_number}';

  /**
   * Update an issue.
   *
   * Issue owners and users with push access can edit an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdate$Response(params: IssuesUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
    return issuesUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an issue.
   *
   * Issue owners and users with push access can edit an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdate(params: IssuesUpdate$Params, context?: HttpContext): Observable<Issue> {
    return this.issuesUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<Issue>): Issue => r.body)
    );
  }

  /** Path part for operation `issuesAddAssignees()` */
  static readonly IssuesAddAssigneesPath = '/repos/{owner}/{repo}/issues/{issue_number}/assignees';

  /**
   * Add assignees to an issue.
   *
   * Adds up to 10 assignees to an issue. Users already assigned to an issue are not replaced.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesAddAssignees()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesAddAssignees$Response(params: IssuesAddAssignees$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
    return issuesAddAssignees(this.http, this.rootUrl, params, context);
  }

  /**
   * Add assignees to an issue.
   *
   * Adds up to 10 assignees to an issue. Users already assigned to an issue are not replaced.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesAddAssignees$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesAddAssignees(params: IssuesAddAssignees$Params, context?: HttpContext): Observable<Issue> {
    return this.issuesAddAssignees$Response(params, context).pipe(
      map((r: StrictHttpResponse<Issue>): Issue => r.body)
    );
  }

  /** Path part for operation `issuesRemoveAssignees()` */
  static readonly IssuesRemoveAssigneesPath = '/repos/{owner}/{repo}/issues/{issue_number}/assignees';

  /**
   * Remove assignees from an issue.
   *
   * Removes one or more assignees from an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesRemoveAssignees()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesRemoveAssignees$Response(params: IssuesRemoveAssignees$Params, context?: HttpContext): Observable<StrictHttpResponse<Issue>> {
    return issuesRemoveAssignees(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove assignees from an issue.
   *
   * Removes one or more assignees from an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesRemoveAssignees$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesRemoveAssignees(params: IssuesRemoveAssignees$Params, context?: HttpContext): Observable<Issue> {
    return this.issuesRemoveAssignees$Response(params, context).pipe(
      map((r: StrictHttpResponse<Issue>): Issue => r.body)
    );
  }

  /** Path part for operation `issuesCheckUserCanBeAssignedToIssue()` */
  static readonly IssuesCheckUserCanBeAssignedToIssuePath = '/repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}';

  /**
   * Check if a user can be assigned to a issue.
   *
   * Checks if a user has permission to be assigned to a specific issue.
   *
   * If the `assignee` can be assigned to this issue, a `204` status code with no content is returned.
   *
   * Otherwise a `404` status code is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCheckUserCanBeAssignedToIssue()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesCheckUserCanBeAssignedToIssue$Response(params: IssuesCheckUserCanBeAssignedToIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesCheckUserCanBeAssignedToIssue(this.http, this.rootUrl, params, context);
  }

  /**
   * Check if a user can be assigned to a issue.
   *
   * Checks if a user has permission to be assigned to a specific issue.
   *
   * If the `assignee` can be assigned to this issue, a `204` status code with no content is returned.
   *
   * Otherwise a `404` status code is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCheckUserCanBeAssignedToIssue$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesCheckUserCanBeAssignedToIssue(params: IssuesCheckUserCanBeAssignedToIssue$Params, context?: HttpContext): Observable<void> {
    return this.issuesCheckUserCanBeAssignedToIssue$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesListComments()` */
  static readonly IssuesListCommentsPath = '/repos/{owner}/{repo}/issues/{issue_number}/comments';

  /**
   * List issue comments.
   *
   * You can use the REST API to list comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * Issue comments are ordered by ascending ID.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListComments()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListComments$Response(params: IssuesListComments$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<IssueComment>>> {
    return issuesListComments(this.http, this.rootUrl, params, context);
  }

  /**
   * List issue comments.
   *
   * You can use the REST API to list comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * Issue comments are ordered by ascending ID.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListComments$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListComments(params: IssuesListComments$Params, context?: HttpContext): Observable<Array<IssueComment>> {
    return this.issuesListComments$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<IssueComment>>): Array<IssueComment> => r.body)
    );
  }

  /** Path part for operation `issuesCreateComment()` */
  static readonly IssuesCreateCommentPath = '/repos/{owner}/{repo}/issues/{issue_number}/comments';

  /**
   * Create an issue comment.
   *
   * You can use the REST API to create comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications).
   * Creating content too quickly using this endpoint may result in secondary rate limiting.
   * See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)"
   * and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)"
   * for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCreateComment()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateComment$Response(params: IssuesCreateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<IssueComment>> {
    return issuesCreateComment(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an issue comment.
   *
   * You can use the REST API to create comments on issues and pull requests. Every pull request is an issue, but not every issue is a pull request.
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications).
   * Creating content too quickly using this endpoint may result in secondary rate limiting.
   * See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)"
   * and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)"
   * for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCreateComment$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateComment(params: IssuesCreateComment$Params, context?: HttpContext): Observable<IssueComment> {
    return this.issuesCreateComment$Response(params, context).pipe(
      map((r: StrictHttpResponse<IssueComment>): IssueComment => r.body)
    );
  }

  /** Path part for operation `issuesListEvents()` */
  static readonly IssuesListEventsPath = '/repos/{owner}/{repo}/issues/{issue_number}/events';

  /**
   * List issue events.
   *
   * Lists all events for an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListEvents()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEvents$Response(params: IssuesListEvents$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<IssueEventForIssue>>> {
    return issuesListEvents(this.http, this.rootUrl, params, context);
  }

  /**
   * List issue events.
   *
   * Lists all events for an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListEvents$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEvents(params: IssuesListEvents$Params, context?: HttpContext): Observable<Array<IssueEventForIssue>> {
    return this.issuesListEvents$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<IssueEventForIssue>>): Array<IssueEventForIssue> => r.body)
    );
  }

  /** Path part for operation `issuesListLabelsOnIssue()` */
  static readonly IssuesListLabelsOnIssuePath = '/repos/{owner}/{repo}/issues/{issue_number}/labels';

  /**
   * List labels for an issue.
   *
   * Lists all labels for an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListLabelsOnIssue()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsOnIssue$Response(params: IssuesListLabelsOnIssue$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesListLabelsOnIssue(this.http, this.rootUrl, params, context);
  }

  /**
   * List labels for an issue.
   *
   * Lists all labels for an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListLabelsOnIssue$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsOnIssue(params: IssuesListLabelsOnIssue$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesListLabelsOnIssue$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesSetLabels()` */
  static readonly IssuesSetLabelsPath = '/repos/{owner}/{repo}/issues/{issue_number}/labels';

  /**
   * Set labels for an issue.
   *
   * Removes any previous labels and sets the new labels for an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesSetLabels()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesSetLabels$Response(params: IssuesSetLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesSetLabels(this.http, this.rootUrl, params, context);
  }

  /**
   * Set labels for an issue.
   *
   * Removes any previous labels and sets the new labels for an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesSetLabels$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesSetLabels(params: IssuesSetLabels$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesSetLabels$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesAddLabels()` */
  static readonly IssuesAddLabelsPath = '/repos/{owner}/{repo}/issues/{issue_number}/labels';

  /**
   * Add labels to an issue.
   *
   * Adds labels to an issue. If you provide an empty array of labels, all labels are removed from the issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesAddLabels()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesAddLabels$Response(params: IssuesAddLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesAddLabels(this.http, this.rootUrl, params, context);
  }

  /**
   * Add labels to an issue.
   *
   * Adds labels to an issue. If you provide an empty array of labels, all labels are removed from the issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesAddLabels$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesAddLabels(params: IssuesAddLabels$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesAddLabels$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesRemoveAllLabels()` */
  static readonly IssuesRemoveAllLabelsPath = '/repos/{owner}/{repo}/issues/{issue_number}/labels';

  /**
   * Remove all labels from an issue.
   *
   * Removes all labels from an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesRemoveAllLabels()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesRemoveAllLabels$Response(params: IssuesRemoveAllLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesRemoveAllLabels(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove all labels from an issue.
   *
   * Removes all labels from an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesRemoveAllLabels$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesRemoveAllLabels(params: IssuesRemoveAllLabels$Params, context?: HttpContext): Observable<void> {
    return this.issuesRemoveAllLabels$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesRemoveLabel()` */
  static readonly IssuesRemoveLabelPath = '/repos/{owner}/{repo}/issues/{issue_number}/labels/{name}';

  /**
   * Remove a label from an issue.
   *
   * Removes the specified label from the issue, and returns the remaining labels on the issue. This endpoint returns a `404 Not Found` status if the label does not exist.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesRemoveLabel()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesRemoveLabel$Response(params: IssuesRemoveLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesRemoveLabel(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a label from an issue.
   *
   * Removes the specified label from the issue, and returns the remaining labels on the issue. This endpoint returns a `404 Not Found` status if the label does not exist.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesRemoveLabel$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesRemoveLabel(params: IssuesRemoveLabel$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesRemoveLabel$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesLock()` */
  static readonly IssuesLockPath = '/repos/{owner}/{repo}/issues/{issue_number}/lock';

  /**
   * Lock an issue.
   *
   * Users with push access can lock an issue or pull request's conversation.
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesLock()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesLock$Response(params: IssuesLock$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesLock(this.http, this.rootUrl, params, context);
  }

  /**
   * Lock an issue.
   *
   * Users with push access can lock an issue or pull request's conversation.
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesLock$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesLock(params: IssuesLock$Params, context?: HttpContext): Observable<void> {
    return this.issuesLock$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesUnlock()` */
  static readonly IssuesUnlockPath = '/repos/{owner}/{repo}/issues/{issue_number}/lock';

  /**
   * Unlock an issue.
   *
   * Users with push access can unlock an issue's conversation.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesUnlock()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesUnlock$Response(params: IssuesUnlock$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesUnlock(this.http, this.rootUrl, params, context);
  }

  /**
   * Unlock an issue.
   *
   * Users with push access can unlock an issue's conversation.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesUnlock$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesUnlock(params: IssuesUnlock$Params, context?: HttpContext): Observable<void> {
    return this.issuesUnlock$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesListEventsForTimeline()` */
  static readonly IssuesListEventsForTimelinePath = '/repos/{owner}/{repo}/issues/{issue_number}/timeline';

  /**
   * List timeline events for an issue.
   *
   * List all timeline events for an issue.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListEventsForTimeline()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEventsForTimeline$Response(params: IssuesListEventsForTimeline$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TimelineIssueEvents>>> {
    return issuesListEventsForTimeline(this.http, this.rootUrl, params, context);
  }

  /**
   * List timeline events for an issue.
   *
   * List all timeline events for an issue.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListEventsForTimeline$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListEventsForTimeline(params: IssuesListEventsForTimeline$Params, context?: HttpContext): Observable<Array<TimelineIssueEvents>> {
    return this.issuesListEventsForTimeline$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TimelineIssueEvents>>): Array<TimelineIssueEvents> => r.body)
    );
  }

  /** Path part for operation `issuesListLabelsForRepo()` */
  static readonly IssuesListLabelsForRepoPath = '/repos/{owner}/{repo}/labels';

  /**
   * List labels for a repository.
   *
   * Lists all labels for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListLabelsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsForRepo$Response(params: IssuesListLabelsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesListLabelsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List labels for a repository.
   *
   * Lists all labels for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListLabelsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsForRepo(params: IssuesListLabelsForRepo$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesListLabelsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesCreateLabel()` */
  static readonly IssuesCreateLabelPath = '/repos/{owner}/{repo}/labels';

  /**
   * Create a label.
   *
   * Creates a label for the specified repository with the given name and color. The name and color parameters are required. The color must be a valid [hexadecimal color code](http://www.color-hex.com/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCreateLabel()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateLabel$Response(params: IssuesCreateLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<Label>> {
    return issuesCreateLabel(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a label.
   *
   * Creates a label for the specified repository with the given name and color. The name and color parameters are required. The color must be a valid [hexadecimal color code](http://www.color-hex.com/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCreateLabel$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateLabel(params: IssuesCreateLabel$Params, context?: HttpContext): Observable<Label> {
    return this.issuesCreateLabel$Response(params, context).pipe(
      map((r: StrictHttpResponse<Label>): Label => r.body)
    );
  }

  /** Path part for operation `issuesGetLabel()` */
  static readonly IssuesGetLabelPath = '/repos/{owner}/{repo}/labels/{name}';

  /**
   * Get a label.
   *
   * Gets a label using the given name.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesGetLabel()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetLabel$Response(params: IssuesGetLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<Label>> {
    return issuesGetLabel(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a label.
   *
   * Gets a label using the given name.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesGetLabel$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetLabel(params: IssuesGetLabel$Params, context?: HttpContext): Observable<Label> {
    return this.issuesGetLabel$Response(params, context).pipe(
      map((r: StrictHttpResponse<Label>): Label => r.body)
    );
  }

  /** Path part for operation `issuesDeleteLabel()` */
  static readonly IssuesDeleteLabelPath = '/repos/{owner}/{repo}/labels/{name}';

  /**
   * Delete a label.
   *
   * Deletes a label using the given label name.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesDeleteLabel()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteLabel$Response(params: IssuesDeleteLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesDeleteLabel(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a label.
   *
   * Deletes a label using the given label name.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesDeleteLabel$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteLabel(params: IssuesDeleteLabel$Params, context?: HttpContext): Observable<void> {
    return this.issuesDeleteLabel$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesUpdateLabel()` */
  static readonly IssuesUpdateLabelPath = '/repos/{owner}/{repo}/labels/{name}';

  /**
   * Update a label.
   *
   * Updates a label using the given label name.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesUpdateLabel()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateLabel$Response(params: IssuesUpdateLabel$Params, context?: HttpContext): Observable<StrictHttpResponse<Label>> {
    return issuesUpdateLabel(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a label.
   *
   * Updates a label using the given label name.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesUpdateLabel$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateLabel(params: IssuesUpdateLabel$Params, context?: HttpContext): Observable<Label> {
    return this.issuesUpdateLabel$Response(params, context).pipe(
      map((r: StrictHttpResponse<Label>): Label => r.body)
    );
  }

  /** Path part for operation `issuesListMilestones()` */
  static readonly IssuesListMilestonesPath = '/repos/{owner}/{repo}/milestones';

  /**
   * List milestones.
   *
   * Lists milestones for a repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListMilestones()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListMilestones$Response(params: IssuesListMilestones$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Milestone>>> {
    return issuesListMilestones(this.http, this.rootUrl, params, context);
  }

  /**
   * List milestones.
   *
   * Lists milestones for a repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListMilestones$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListMilestones(params: IssuesListMilestones$Params, context?: HttpContext): Observable<Array<Milestone>> {
    return this.issuesListMilestones$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Milestone>>): Array<Milestone> => r.body)
    );
  }

  /** Path part for operation `issuesCreateMilestone()` */
  static readonly IssuesCreateMilestonePath = '/repos/{owner}/{repo}/milestones';

  /**
   * Create a milestone.
   *
   * Creates a milestone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesCreateMilestone()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateMilestone$Response(params: IssuesCreateMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Milestone>> {
    return issuesCreateMilestone(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a milestone.
   *
   * Creates a milestone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesCreateMilestone$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesCreateMilestone(params: IssuesCreateMilestone$Params, context?: HttpContext): Observable<Milestone> {
    return this.issuesCreateMilestone$Response(params, context).pipe(
      map((r: StrictHttpResponse<Milestone>): Milestone => r.body)
    );
  }

  /** Path part for operation `issuesGetMilestone()` */
  static readonly IssuesGetMilestonePath = '/repos/{owner}/{repo}/milestones/{milestone_number}';

  /**
   * Get a milestone.
   *
   * Gets a milestone using the given milestone number.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesGetMilestone()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetMilestone$Response(params: IssuesGetMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Milestone>> {
    return issuesGetMilestone(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a milestone.
   *
   * Gets a milestone using the given milestone number.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesGetMilestone$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesGetMilestone(params: IssuesGetMilestone$Params, context?: HttpContext): Observable<Milestone> {
    return this.issuesGetMilestone$Response(params, context).pipe(
      map((r: StrictHttpResponse<Milestone>): Milestone => r.body)
    );
  }

  /** Path part for operation `issuesDeleteMilestone()` */
  static readonly IssuesDeleteMilestonePath = '/repos/{owner}/{repo}/milestones/{milestone_number}';

  /**
   * Delete a milestone.
   *
   * Deletes a milestone using the given milestone number.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesDeleteMilestone()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteMilestone$Response(params: IssuesDeleteMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return issuesDeleteMilestone(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a milestone.
   *
   * Deletes a milestone using the given milestone number.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesDeleteMilestone$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesDeleteMilestone(params: IssuesDeleteMilestone$Params, context?: HttpContext): Observable<void> {
    return this.issuesDeleteMilestone$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `issuesUpdateMilestone()` */
  static readonly IssuesUpdateMilestonePath = '/repos/{owner}/{repo}/milestones/{milestone_number}';

  /**
   * Update a milestone.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesUpdateMilestone()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateMilestone$Response(params: IssuesUpdateMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Milestone>> {
    return issuesUpdateMilestone(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a milestone.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesUpdateMilestone$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  issuesUpdateMilestone(params: IssuesUpdateMilestone$Params, context?: HttpContext): Observable<Milestone> {
    return this.issuesUpdateMilestone$Response(params, context).pipe(
      map((r: StrictHttpResponse<Milestone>): Milestone => r.body)
    );
  }

  /** Path part for operation `issuesListLabelsForMilestone()` */
  static readonly IssuesListLabelsForMilestonePath = '/repos/{owner}/{repo}/milestones/{milestone_number}/labels';

  /**
   * List labels for issues in a milestone.
   *
   * Lists labels for issues in a milestone.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListLabelsForMilestone()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsForMilestone$Response(params: IssuesListLabelsForMilestone$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Label>>> {
    return issuesListLabelsForMilestone(this.http, this.rootUrl, params, context);
  }

  /**
   * List labels for issues in a milestone.
   *
   * Lists labels for issues in a milestone.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListLabelsForMilestone$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListLabelsForMilestone(params: IssuesListLabelsForMilestone$Params, context?: HttpContext): Observable<Array<Label>> {
    return this.issuesListLabelsForMilestone$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Label>>): Array<Label> => r.body)
    );
  }

  /** Path part for operation `issuesListForAuthenticatedUser()` */
  static readonly IssuesListForAuthenticatedUserPath = '/user/issues';

  /**
   * List user account issues assigned to the authenticated user.
   *
   * List issues across owned and member repositories assigned to the authenticated user.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `issuesListForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForAuthenticatedUser$Response(params?: IssuesListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Issue>>> {
    return issuesListForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List user account issues assigned to the authenticated user.
   *
   * List issues across owned and member repositories assigned to the authenticated user.
   *
   * **Note**: GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this
   * reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by
   * the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull
   * request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `issuesListForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  issuesListForAuthenticatedUser(params?: IssuesListForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<Issue>> {
    return this.issuesListForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Issue>>): Array<Issue> => r.body)
    );
  }

}
