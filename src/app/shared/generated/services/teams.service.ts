/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { MinimalRepository } from '../models/minimal-repository';
import { OrganizationInvitation } from '../models/organization-invitation';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';
import { TeamDiscussion } from '../models/team-discussion';
import { TeamDiscussionComment } from '../models/team-discussion-comment';
import { TeamFull } from '../models/team-full';
import { TeamMembership } from '../models/team-membership';
import { TeamProject } from '../models/team-project';
import { TeamRepository } from '../models/team-repository';
import { teamsAddMemberLegacy } from '../fn/teams/teams-add-member-legacy';
import { TeamsAddMemberLegacy$Params } from '../fn/teams/teams-add-member-legacy';
import { teamsAddOrUpdateMembershipForUserInOrg } from '../fn/teams/teams-add-or-update-membership-for-user-in-org';
import { TeamsAddOrUpdateMembershipForUserInOrg$Params } from '../fn/teams/teams-add-or-update-membership-for-user-in-org';
import { teamsAddOrUpdateMembershipForUserLegacy } from '../fn/teams/teams-add-or-update-membership-for-user-legacy';
import { TeamsAddOrUpdateMembershipForUserLegacy$Params } from '../fn/teams/teams-add-or-update-membership-for-user-legacy';
import { teamsAddOrUpdateProjectPermissionsInOrg } from '../fn/teams/teams-add-or-update-project-permissions-in-org';
import { TeamsAddOrUpdateProjectPermissionsInOrg$Params } from '../fn/teams/teams-add-or-update-project-permissions-in-org';
import { teamsAddOrUpdateProjectPermissionsLegacy } from '../fn/teams/teams-add-or-update-project-permissions-legacy';
import { TeamsAddOrUpdateProjectPermissionsLegacy$Params } from '../fn/teams/teams-add-or-update-project-permissions-legacy';
import { teamsAddOrUpdateRepoPermissionsInOrg } from '../fn/teams/teams-add-or-update-repo-permissions-in-org';
import { TeamsAddOrUpdateRepoPermissionsInOrg$Params } from '../fn/teams/teams-add-or-update-repo-permissions-in-org';
import { teamsAddOrUpdateRepoPermissionsLegacy } from '../fn/teams/teams-add-or-update-repo-permissions-legacy';
import { TeamsAddOrUpdateRepoPermissionsLegacy$Params } from '../fn/teams/teams-add-or-update-repo-permissions-legacy';
import { teamsCheckPermissionsForProjectInOrg } from '../fn/teams/teams-check-permissions-for-project-in-org';
import { TeamsCheckPermissionsForProjectInOrg$Params } from '../fn/teams/teams-check-permissions-for-project-in-org';
import { teamsCheckPermissionsForProjectLegacy } from '../fn/teams/teams-check-permissions-for-project-legacy';
import { TeamsCheckPermissionsForProjectLegacy$Params } from '../fn/teams/teams-check-permissions-for-project-legacy';
import { teamsCheckPermissionsForRepoInOrg } from '../fn/teams/teams-check-permissions-for-repo-in-org';
import { TeamsCheckPermissionsForRepoInOrg$Params } from '../fn/teams/teams-check-permissions-for-repo-in-org';
import { teamsCheckPermissionsForRepoLegacy } from '../fn/teams/teams-check-permissions-for-repo-legacy';
import { TeamsCheckPermissionsForRepoLegacy$Params } from '../fn/teams/teams-check-permissions-for-repo-legacy';
import { teamsCreate } from '../fn/teams/teams-create';
import { TeamsCreate$Params } from '../fn/teams/teams-create';
import { teamsCreateDiscussionCommentInOrg } from '../fn/teams/teams-create-discussion-comment-in-org';
import { TeamsCreateDiscussionCommentInOrg$Params } from '../fn/teams/teams-create-discussion-comment-in-org';
import { teamsCreateDiscussionCommentLegacy } from '../fn/teams/teams-create-discussion-comment-legacy';
import { TeamsCreateDiscussionCommentLegacy$Params } from '../fn/teams/teams-create-discussion-comment-legacy';
import { teamsCreateDiscussionInOrg } from '../fn/teams/teams-create-discussion-in-org';
import { TeamsCreateDiscussionInOrg$Params } from '../fn/teams/teams-create-discussion-in-org';
import { teamsCreateDiscussionLegacy } from '../fn/teams/teams-create-discussion-legacy';
import { TeamsCreateDiscussionLegacy$Params } from '../fn/teams/teams-create-discussion-legacy';
import { teamsDeleteDiscussionCommentInOrg } from '../fn/teams/teams-delete-discussion-comment-in-org';
import { TeamsDeleteDiscussionCommentInOrg$Params } from '../fn/teams/teams-delete-discussion-comment-in-org';
import { teamsDeleteDiscussionCommentLegacy } from '../fn/teams/teams-delete-discussion-comment-legacy';
import { TeamsDeleteDiscussionCommentLegacy$Params } from '../fn/teams/teams-delete-discussion-comment-legacy';
import { teamsDeleteDiscussionInOrg } from '../fn/teams/teams-delete-discussion-in-org';
import { TeamsDeleteDiscussionInOrg$Params } from '../fn/teams/teams-delete-discussion-in-org';
import { teamsDeleteDiscussionLegacy } from '../fn/teams/teams-delete-discussion-legacy';
import { TeamsDeleteDiscussionLegacy$Params } from '../fn/teams/teams-delete-discussion-legacy';
import { teamsDeleteInOrg } from '../fn/teams/teams-delete-in-org';
import { TeamsDeleteInOrg$Params } from '../fn/teams/teams-delete-in-org';
import { teamsDeleteLegacy } from '../fn/teams/teams-delete-legacy';
import { TeamsDeleteLegacy$Params } from '../fn/teams/teams-delete-legacy';
import { teamsGetByName } from '../fn/teams/teams-get-by-name';
import { TeamsGetByName$Params } from '../fn/teams/teams-get-by-name';
import { teamsGetDiscussionCommentInOrg } from '../fn/teams/teams-get-discussion-comment-in-org';
import { TeamsGetDiscussionCommentInOrg$Params } from '../fn/teams/teams-get-discussion-comment-in-org';
import { teamsGetDiscussionCommentLegacy } from '../fn/teams/teams-get-discussion-comment-legacy';
import { TeamsGetDiscussionCommentLegacy$Params } from '../fn/teams/teams-get-discussion-comment-legacy';
import { teamsGetDiscussionInOrg } from '../fn/teams/teams-get-discussion-in-org';
import { TeamsGetDiscussionInOrg$Params } from '../fn/teams/teams-get-discussion-in-org';
import { teamsGetDiscussionLegacy } from '../fn/teams/teams-get-discussion-legacy';
import { TeamsGetDiscussionLegacy$Params } from '../fn/teams/teams-get-discussion-legacy';
import { teamsGetLegacy } from '../fn/teams/teams-get-legacy';
import { TeamsGetLegacy$Params } from '../fn/teams/teams-get-legacy';
import { teamsGetMemberLegacy } from '../fn/teams/teams-get-member-legacy';
import { TeamsGetMemberLegacy$Params } from '../fn/teams/teams-get-member-legacy';
import { teamsGetMembershipForUserInOrg } from '../fn/teams/teams-get-membership-for-user-in-org';
import { TeamsGetMembershipForUserInOrg$Params } from '../fn/teams/teams-get-membership-for-user-in-org';
import { teamsGetMembershipForUserLegacy } from '../fn/teams/teams-get-membership-for-user-legacy';
import { TeamsGetMembershipForUserLegacy$Params } from '../fn/teams/teams-get-membership-for-user-legacy';
import { teamsList } from '../fn/teams/teams-list';
import { TeamsList$Params } from '../fn/teams/teams-list';
import { teamsListChildInOrg } from '../fn/teams/teams-list-child-in-org';
import { TeamsListChildInOrg$Params } from '../fn/teams/teams-list-child-in-org';
import { teamsListChildLegacy } from '../fn/teams/teams-list-child-legacy';
import { TeamsListChildLegacy$Params } from '../fn/teams/teams-list-child-legacy';
import { teamsListDiscussionCommentsInOrg } from '../fn/teams/teams-list-discussion-comments-in-org';
import { TeamsListDiscussionCommentsInOrg$Params } from '../fn/teams/teams-list-discussion-comments-in-org';
import { teamsListDiscussionCommentsLegacy } from '../fn/teams/teams-list-discussion-comments-legacy';
import { TeamsListDiscussionCommentsLegacy$Params } from '../fn/teams/teams-list-discussion-comments-legacy';
import { teamsListDiscussionsInOrg } from '../fn/teams/teams-list-discussions-in-org';
import { TeamsListDiscussionsInOrg$Params } from '../fn/teams/teams-list-discussions-in-org';
import { teamsListDiscussionsLegacy } from '../fn/teams/teams-list-discussions-legacy';
import { TeamsListDiscussionsLegacy$Params } from '../fn/teams/teams-list-discussions-legacy';
import { teamsListForAuthenticatedUser } from '../fn/teams/teams-list-for-authenticated-user';
import { TeamsListForAuthenticatedUser$Params } from '../fn/teams/teams-list-for-authenticated-user';
import { teamsListMembersInOrg } from '../fn/teams/teams-list-members-in-org';
import { TeamsListMembersInOrg$Params } from '../fn/teams/teams-list-members-in-org';
import { teamsListMembersLegacy } from '../fn/teams/teams-list-members-legacy';
import { TeamsListMembersLegacy$Params } from '../fn/teams/teams-list-members-legacy';
import { teamsListPendingInvitationsInOrg } from '../fn/teams/teams-list-pending-invitations-in-org';
import { TeamsListPendingInvitationsInOrg$Params } from '../fn/teams/teams-list-pending-invitations-in-org';
import { teamsListPendingInvitationsLegacy } from '../fn/teams/teams-list-pending-invitations-legacy';
import { TeamsListPendingInvitationsLegacy$Params } from '../fn/teams/teams-list-pending-invitations-legacy';
import { teamsListProjectsInOrg } from '../fn/teams/teams-list-projects-in-org';
import { TeamsListProjectsInOrg$Params } from '../fn/teams/teams-list-projects-in-org';
import { teamsListProjectsLegacy } from '../fn/teams/teams-list-projects-legacy';
import { TeamsListProjectsLegacy$Params } from '../fn/teams/teams-list-projects-legacy';
import { teamsListReposInOrg } from '../fn/teams/teams-list-repos-in-org';
import { TeamsListReposInOrg$Params } from '../fn/teams/teams-list-repos-in-org';
import { teamsListReposLegacy } from '../fn/teams/teams-list-repos-legacy';
import { TeamsListReposLegacy$Params } from '../fn/teams/teams-list-repos-legacy';
import { teamsRemoveMemberLegacy } from '../fn/teams/teams-remove-member-legacy';
import { TeamsRemoveMemberLegacy$Params } from '../fn/teams/teams-remove-member-legacy';
import { teamsRemoveMembershipForUserInOrg } from '../fn/teams/teams-remove-membership-for-user-in-org';
import { TeamsRemoveMembershipForUserInOrg$Params } from '../fn/teams/teams-remove-membership-for-user-in-org';
import { teamsRemoveMembershipForUserLegacy } from '../fn/teams/teams-remove-membership-for-user-legacy';
import { TeamsRemoveMembershipForUserLegacy$Params } from '../fn/teams/teams-remove-membership-for-user-legacy';
import { teamsRemoveProjectInOrg } from '../fn/teams/teams-remove-project-in-org';
import { TeamsRemoveProjectInOrg$Params } from '../fn/teams/teams-remove-project-in-org';
import { teamsRemoveProjectLegacy } from '../fn/teams/teams-remove-project-legacy';
import { TeamsRemoveProjectLegacy$Params } from '../fn/teams/teams-remove-project-legacy';
import { teamsRemoveRepoInOrg } from '../fn/teams/teams-remove-repo-in-org';
import { TeamsRemoveRepoInOrg$Params } from '../fn/teams/teams-remove-repo-in-org';
import { teamsRemoveRepoLegacy } from '../fn/teams/teams-remove-repo-legacy';
import { TeamsRemoveRepoLegacy$Params } from '../fn/teams/teams-remove-repo-legacy';
import { teamsUpdateDiscussionCommentInOrg } from '../fn/teams/teams-update-discussion-comment-in-org';
import { TeamsUpdateDiscussionCommentInOrg$Params } from '../fn/teams/teams-update-discussion-comment-in-org';
import { teamsUpdateDiscussionCommentLegacy } from '../fn/teams/teams-update-discussion-comment-legacy';
import { TeamsUpdateDiscussionCommentLegacy$Params } from '../fn/teams/teams-update-discussion-comment-legacy';
import { teamsUpdateDiscussionInOrg } from '../fn/teams/teams-update-discussion-in-org';
import { TeamsUpdateDiscussionInOrg$Params } from '../fn/teams/teams-update-discussion-in-org';
import { teamsUpdateDiscussionLegacy } from '../fn/teams/teams-update-discussion-legacy';
import { TeamsUpdateDiscussionLegacy$Params } from '../fn/teams/teams-update-discussion-legacy';
import { teamsUpdateInOrg } from '../fn/teams/teams-update-in-org';
import { TeamsUpdateInOrg$Params } from '../fn/teams/teams-update-in-org';
import { teamsUpdateLegacy } from '../fn/teams/teams-update-legacy';
import { TeamsUpdateLegacy$Params } from '../fn/teams/teams-update-legacy';


/**
 * Interact with GitHub Teams.
 */
@Injectable({ providedIn: 'root' })
export class TeamsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `teamsList()` */
  static readonly TeamsListPath = '/orgs/{org}/teams';

  /**
   * List teams.
   *
   * Lists all teams in an organization that are visible to the authenticated user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsList()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsList$Response(params: TeamsList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return teamsList(this.http, this.rootUrl, params, context);
  }

  /**
   * List teams.
   *
   * Lists all teams in an organization that are visible to the authenticated user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsList$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsList(params: TeamsList$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.teamsList$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `teamsCreate()` */
  static readonly TeamsCreatePath = '/orgs/{org}/teams';

  /**
   * Create a team.
   *
   * To create a team, the authenticated user must be a member or owner of `{org}`. By default, organization members can create teams. Organization owners can limit team creation to organization owners. For more information, see "[Setting team creation permissions](https://docs.github.com/articles/setting-team-creation-permissions-in-your-organization)."
   *
   * When you create a new team, you automatically become a team maintainer without explicitly adding yourself to the optional array of `maintainers`. For more information, see "[About teams](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/about-teams)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCreate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreate$Response(params: TeamsCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
    return teamsCreate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a team.
   *
   * To create a team, the authenticated user must be a member or owner of `{org}`. By default, organization members can create teams. Organization owners can limit team creation to organization owners. For more information, see "[Setting team creation permissions](https://docs.github.com/articles/setting-team-creation-permissions-in-your-organization)."
   *
   * When you create a new team, you automatically become a team maintainer without explicitly adding yourself to the optional array of `maintainers`. For more information, see "[About teams](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/about-teams)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCreate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreate(params: TeamsCreate$Params, context?: HttpContext): Observable<TeamFull> {
    return this.teamsCreate$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamFull>): TeamFull => r.body)
    );
  }

  /** Path part for operation `teamsGetByName()` */
  static readonly TeamsGetByNamePath = '/orgs/{org}/teams/{team_slug}';

  /**
   * Get a team by name.
   *
   * Gets a team using the team's `slug`. To create the `slug`, GitHub replaces special characters in the `name` string, changes all words to lowercase, and replaces spaces with a `-` separator. For example, `"My TEam Näme"` would become `my-team-name`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetByName()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetByName$Response(params: TeamsGetByName$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
    return teamsGetByName(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a team by name.
   *
   * Gets a team using the team's `slug`. To create the `slug`, GitHub replaces special characters in the `name` string, changes all words to lowercase, and replaces spaces with a `-` separator. For example, `"My TEam Näme"` would become `my-team-name`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetByName$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetByName(params: TeamsGetByName$Params, context?: HttpContext): Observable<TeamFull> {
    return this.teamsGetByName$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamFull>): TeamFull => r.body)
    );
  }

  /** Path part for operation `teamsDeleteInOrg()` */
  static readonly TeamsDeleteInOrgPath = '/orgs/{org}/teams/{team_slug}';

  /**
   * Delete a team.
   *
   * To delete a team, the authenticated user must be an organization owner or team maintainer.
   *
   * If you are an organization owner, deleting a parent team will delete all of its child teams as well.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteInOrg$Response(params: TeamsDeleteInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a team.
   *
   * To delete a team, the authenticated user must be an organization owner or team maintainer.
   *
   * If you are an organization owner, deleting a parent team will delete all of its child teams as well.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteInOrg(params: TeamsDeleteInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateInOrg()` */
  static readonly TeamsUpdateInOrgPath = '/orgs/{org}/teams/{team_slug}';

  /**
   * Update a team.
   *
   * To edit a team, the authenticated user must either be an organization owner or a team maintainer.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateInOrg$Response(params: TeamsUpdateInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
    return teamsUpdateInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a team.
   *
   * To edit a team, the authenticated user must either be an organization owner or a team maintainer.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateInOrg(params: TeamsUpdateInOrg$Params, context?: HttpContext): Observable<TeamFull> {
    return this.teamsUpdateInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamFull>): TeamFull => r.body)
    );
  }

  /** Path part for operation `teamsListDiscussionsInOrg()` */
  static readonly TeamsListDiscussionsInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions';

  /**
   * List discussions.
   *
   * List all discussions on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListDiscussionsInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListDiscussionsInOrg$Response(params: TeamsListDiscussionsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamDiscussion>>> {
    return teamsListDiscussionsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List discussions.
   *
   * List all discussions on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListDiscussionsInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListDiscussionsInOrg(params: TeamsListDiscussionsInOrg$Params, context?: HttpContext): Observable<Array<TeamDiscussion>> {
    return this.teamsListDiscussionsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamDiscussion>>): Array<TeamDiscussion> => r.body)
    );
  }

  /** Path part for operation `teamsCreateDiscussionInOrg()` */
  static readonly TeamsCreateDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions';

  /**
   * Create a discussion.
   *
   * Creates a new discussion post on a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/{org_id}/team/{team_id}/discussions`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCreateDiscussionInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreateDiscussionInOrg$Response(params: TeamsCreateDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsCreateDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a discussion.
   *
   * Creates a new discussion post on a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/{org_id}/team/{team_id}/discussions`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCreateDiscussionInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreateDiscussionInOrg(params: TeamsCreateDiscussionInOrg$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsCreateDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsGetDiscussionInOrg()` */
  static readonly TeamsGetDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}';

  /**
   * Get a discussion.
   *
   * Get a specific discussion on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetDiscussionInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetDiscussionInOrg$Response(params: TeamsGetDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsGetDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a discussion.
   *
   * Get a specific discussion on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetDiscussionInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetDiscussionInOrg(params: TeamsGetDiscussionInOrg$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsGetDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsDeleteDiscussionInOrg()` */
  static readonly TeamsDeleteDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}';

  /**
   * Delete a discussion.
   *
   * Delete a discussion from a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteDiscussionInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteDiscussionInOrg$Response(params: TeamsDeleteDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a discussion.
   *
   * Delete a discussion from a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteDiscussionInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteDiscussionInOrg(params: TeamsDeleteDiscussionInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateDiscussionInOrg()` */
  static readonly TeamsUpdateDiscussionInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}';

  /**
   * Update a discussion.
   *
   * Edits the title and body text of a discussion post. Only the parameters you provide are updated. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateDiscussionInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateDiscussionInOrg$Response(params: TeamsUpdateDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsUpdateDiscussionInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a discussion.
   *
   * Edits the title and body text of a discussion post. Only the parameters you provide are updated. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateDiscussionInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateDiscussionInOrg(params: TeamsUpdateDiscussionInOrg$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsUpdateDiscussionInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsListDiscussionCommentsInOrg()` */
  static readonly TeamsListDiscussionCommentsInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments';

  /**
   * List discussion comments.
   *
   * List all comments on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListDiscussionCommentsInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListDiscussionCommentsInOrg$Response(params: TeamsListDiscussionCommentsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamDiscussionComment>>> {
    return teamsListDiscussionCommentsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List discussion comments.
   *
   * List all comments on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListDiscussionCommentsInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListDiscussionCommentsInOrg(params: TeamsListDiscussionCommentsInOrg$Params, context?: HttpContext): Observable<Array<TeamDiscussionComment>> {
    return this.teamsListDiscussionCommentsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamDiscussionComment>>): Array<TeamDiscussionComment> => r.body)
    );
  }

  /** Path part for operation `teamsCreateDiscussionCommentInOrg()` */
  static readonly TeamsCreateDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments';

  /**
   * Create a discussion comment.
   *
   * Creates a new comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCreateDiscussionCommentInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreateDiscussionCommentInOrg$Response(params: TeamsCreateDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsCreateDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a discussion comment.
   *
   * Creates a new comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `POST /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCreateDiscussionCommentInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsCreateDiscussionCommentInOrg(params: TeamsCreateDiscussionCommentInOrg$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsCreateDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsGetDiscussionCommentInOrg()` */
  static readonly TeamsGetDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Get a discussion comment.
   *
   * Get a specific comment on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetDiscussionCommentInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetDiscussionCommentInOrg$Response(params: TeamsGetDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsGetDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a discussion comment.
   *
   * Get a specific comment on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetDiscussionCommentInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetDiscussionCommentInOrg(params: TeamsGetDiscussionCommentInOrg$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsGetDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsDeleteDiscussionCommentInOrg()` */
  static readonly TeamsDeleteDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Delete a discussion comment.
   *
   * Deletes a comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteDiscussionCommentInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteDiscussionCommentInOrg$Response(params: TeamsDeleteDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a discussion comment.
   *
   * Deletes a comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteDiscussionCommentInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsDeleteDiscussionCommentInOrg(params: TeamsDeleteDiscussionCommentInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateDiscussionCommentInOrg()` */
  static readonly TeamsUpdateDiscussionCommentInOrgPath = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Update a discussion comment.
   *
   * Edits the body text of a discussion comment. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateDiscussionCommentInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateDiscussionCommentInOrg$Response(params: TeamsUpdateDiscussionCommentInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsUpdateDiscussionCommentInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a discussion comment.
   *
   * Edits the body text of a discussion comment. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PATCH /organizations/{org_id}/team/{team_id}/discussions/{discussion_number}/comments/{comment_number}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateDiscussionCommentInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsUpdateDiscussionCommentInOrg(params: TeamsUpdateDiscussionCommentInOrg$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsUpdateDiscussionCommentInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsListPendingInvitationsInOrg()` */
  static readonly TeamsListPendingInvitationsInOrgPath = '/orgs/{org}/teams/{team_slug}/invitations';

  /**
   * List pending team invitations.
   *
   * The return hash contains a `role` field which refers to the Organization Invitation role and will be one of the following values: `direct_member`, `admin`, `billing_manager`, `hiring_manager`, or `reinstate`. If the invitee is not a GitHub member, the `login` field in the return hash will be `null`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/invitations`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListPendingInvitationsInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListPendingInvitationsInOrg$Response(params: TeamsListPendingInvitationsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationInvitation>>> {
    return teamsListPendingInvitationsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List pending team invitations.
   *
   * The return hash contains a `role` field which refers to the Organization Invitation role and will be one of the following values: `direct_member`, `admin`, `billing_manager`, `hiring_manager`, or `reinstate`. If the invitee is not a GitHub member, the `login` field in the return hash will be `null`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/invitations`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListPendingInvitationsInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListPendingInvitationsInOrg(params: TeamsListPendingInvitationsInOrg$Params, context?: HttpContext): Observable<Array<OrganizationInvitation>> {
    return this.teamsListPendingInvitationsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<OrganizationInvitation>>): Array<OrganizationInvitation> => r.body)
    );
  }

  /** Path part for operation `teamsListMembersInOrg()` */
  static readonly TeamsListMembersInOrgPath = '/orgs/{org}/teams/{team_slug}/members';

  /**
   * List team members.
   *
   * Team members will include the members of child teams.
   *
   * To list members in a team, the team must be visible to the authenticated user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListMembersInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListMembersInOrg$Response(params: TeamsListMembersInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return teamsListMembersInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List team members.
   *
   * Team members will include the members of child teams.
   *
   * To list members in a team, the team must be visible to the authenticated user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListMembersInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListMembersInOrg(params: TeamsListMembersInOrg$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.teamsListMembersInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `teamsGetMembershipForUserInOrg()` */
  static readonly TeamsGetMembershipForUserInOrgPath = '/orgs/{org}/teams/{team_slug}/memberships/{username}';

  /**
   * Get team membership for a user.
   *
   * Team members will include the members of child teams.
   *
   * To get a user's membership with a team, the team must be visible to the authenticated user.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * **Note:**
   * The response contains the `state` of the membership and the member's `role`.
   *
   * The `role` for organization owners is set to `maintainer`. For more information about `maintainer` roles, see [Create a team](https://docs.github.com/rest/teams/teams#create-a-team).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetMembershipForUserInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetMembershipForUserInOrg$Response(params: TeamsGetMembershipForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
    return teamsGetMembershipForUserInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get team membership for a user.
   *
   * Team members will include the members of child teams.
   *
   * To get a user's membership with a team, the team must be visible to the authenticated user.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * **Note:**
   * The response contains the `state` of the membership and the member's `role`.
   *
   * The `role` for organization owners is set to `maintainer`. For more information about `maintainer` roles, see [Create a team](https://docs.github.com/rest/teams/teams#create-a-team).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetMembershipForUserInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsGetMembershipForUserInOrg(params: TeamsGetMembershipForUserInOrg$Params, context?: HttpContext): Observable<TeamMembership> {
    return this.teamsGetMembershipForUserInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamMembership>): TeamMembership => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateMembershipForUserInOrg()` */
  static readonly TeamsAddOrUpdateMembershipForUserInOrgPath = '/orgs/{org}/teams/{team_slug}/memberships/{username}';

  /**
   * Add or update team membership for a user.
   *
   * Adds an organization member to a team. An authenticated organization owner or team maintainer can add organization members to a team.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * An organization owner can add someone who is not part of the team's organization to a team. When an organization owner adds someone to a team who is not an organization member, this endpoint will send an invitation to the person via email. This newly-created membership will be in the "pending" state until the person accepts the invitation, at which point the membership will transition to the "active" state and the user will be added as a member of the team.
   *
   * If the user is already a member of the team, this endpoint will update the role of the team member's role. To update the membership of a team member, the authenticated user must be an organization owner or a team maintainer.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateMembershipForUserInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateMembershipForUserInOrg$Response(params: TeamsAddOrUpdateMembershipForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
    return teamsAddOrUpdateMembershipForUserInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team membership for a user.
   *
   * Adds an organization member to a team. An authenticated organization owner or team maintainer can add organization members to a team.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * An organization owner can add someone who is not part of the team's organization to a team. When an organization owner adds someone to a team who is not an organization member, this endpoint will send an invitation to the person via email. This newly-created membership will be in the "pending" state until the person accepts the invitation, at which point the membership will transition to the "active" state and the user will be added as a member of the team.
   *
   * If the user is already a member of the team, this endpoint will update the role of the team member's role. To update the membership of a team member, the authenticated user must be an organization owner or a team maintainer.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateMembershipForUserInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateMembershipForUserInOrg(params: TeamsAddOrUpdateMembershipForUserInOrg$Params, context?: HttpContext): Observable<TeamMembership> {
    return this.teamsAddOrUpdateMembershipForUserInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamMembership>): TeamMembership => r.body)
    );
  }

  /** Path part for operation `teamsRemoveMembershipForUserInOrg()` */
  static readonly TeamsRemoveMembershipForUserInOrgPath = '/orgs/{org}/teams/{team_slug}/memberships/{username}';

  /**
   * Remove team membership for a user.
   *
   * To remove a membership between a user and a team, the authenticated user must have 'admin' permissions to the team or be an owner of the organization that the team is associated with. Removing team membership does not delete the user, it just removes their membership from the team.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveMembershipForUserInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveMembershipForUserInOrg$Response(params: TeamsRemoveMembershipForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveMembershipForUserInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove team membership for a user.
   *
   * To remove a membership between a user and a team, the authenticated user must have 'admin' permissions to the team or be an owner of the organization that the team is associated with. Removing team membership does not delete the user, it just removes their membership from the team.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/memberships/{username}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveMembershipForUserInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveMembershipForUserInOrg(params: TeamsRemoveMembershipForUserInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveMembershipForUserInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListProjectsInOrg()` */
  static readonly TeamsListProjectsInOrgPath = '/orgs/{org}/teams/{team_slug}/projects';

  /**
   * List team projects.
   *
   * Lists the organization projects for a team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/projects`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListProjectsInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListProjectsInOrg$Response(params: TeamsListProjectsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamProject>>> {
    return teamsListProjectsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List team projects.
   *
   * Lists the organization projects for a team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/projects`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListProjectsInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListProjectsInOrg(params: TeamsListProjectsInOrg$Params, context?: HttpContext): Observable<Array<TeamProject>> {
    return this.teamsListProjectsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamProject>>): Array<TeamProject> => r.body)
    );
  }

  /** Path part for operation `teamsCheckPermissionsForProjectInOrg()` */
  static readonly TeamsCheckPermissionsForProjectInOrgPath = '/orgs/{org}/teams/{team_slug}/projects/{project_id}';

  /**
   * Check team permissions for a project.
   *
   * Checks whether a team has `read`, `write`, or `admin` permissions for an organization project. The response includes projects inherited from a parent team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCheckPermissionsForProjectInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsCheckPermissionsForProjectInOrg$Response(params: TeamsCheckPermissionsForProjectInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamProject>> {
    return teamsCheckPermissionsForProjectInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Check team permissions for a project.
   *
   * Checks whether a team has `read`, `write`, or `admin` permissions for an organization project. The response includes projects inherited from a parent team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCheckPermissionsForProjectInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsCheckPermissionsForProjectInOrg(params: TeamsCheckPermissionsForProjectInOrg$Params, context?: HttpContext): Observable<TeamProject> {
    return this.teamsCheckPermissionsForProjectInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamProject>): TeamProject => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateProjectPermissionsInOrg()` */
  static readonly TeamsAddOrUpdateProjectPermissionsInOrgPath = '/orgs/{org}/teams/{team_slug}/projects/{project_id}';

  /**
   * Add or update team project permissions.
   *
   * Adds an organization project to a team. To add a project to a team or update the team's permission on a project, the authenticated user must have `admin` permissions for the project. The project and team must be part of the same organization.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateProjectPermissionsInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateProjectPermissionsInOrg$Response(params: TeamsAddOrUpdateProjectPermissionsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsAddOrUpdateProjectPermissionsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team project permissions.
   *
   * Adds an organization project to a team. To add a project to a team or update the team's permission on a project, the authenticated user must have `admin` permissions for the project. The project and team must be part of the same organization.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateProjectPermissionsInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateProjectPermissionsInOrg(params: TeamsAddOrUpdateProjectPermissionsInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsAddOrUpdateProjectPermissionsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsRemoveProjectInOrg()` */
  static readonly TeamsRemoveProjectInOrgPath = '/orgs/{org}/teams/{team_slug}/projects/{project_id}';

  /**
   * Remove a project from a team.
   *
   * Removes an organization project from a team. An organization owner or a team maintainer can remove any project from the team. To remove a project from a team as an organization member, the authenticated user must have `read` access to both the team and project, or `admin` access to the team or project. This endpoint removes the project from the team, but does not delete the project.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveProjectInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveProjectInOrg$Response(params: TeamsRemoveProjectInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveProjectInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a project from a team.
   *
   * Removes an organization project from a team. An organization owner or a team maintainer can remove any project from the team. To remove a project from a team as an organization member, the authenticated user must have `read` access to both the team and project, or `admin` access to the team or project. This endpoint removes the project from the team, but does not delete the project.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/projects/{project_id}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveProjectInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveProjectInOrg(params: TeamsRemoveProjectInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveProjectInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListReposInOrg()` */
  static readonly TeamsListReposInOrgPath = '/orgs/{org}/teams/{team_slug}/repos';

  /**
   * List team repositories.
   *
   * Lists a team's repositories visible to the authenticated user.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/repos`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListReposInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListReposInOrg$Response(params: TeamsListReposInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return teamsListReposInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List team repositories.
   *
   * Lists a team's repositories visible to the authenticated user.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/repos`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListReposInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListReposInOrg(params: TeamsListReposInOrg$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.teamsListReposInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `teamsCheckPermissionsForRepoInOrg()` */
  static readonly TeamsCheckPermissionsForRepoInOrgPath = '/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}';

  /**
   * Check team permissions for a repository.
   *
   * Checks whether a team has `admin`, `push`, `maintain`, `triage`, or `pull` permission for a repository. Repositories inherited through a parent team will also be checked.
   *
   * You can also get information about the specified repository, including what permissions the team grants on it, by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `application/vnd.github.v3.repository+json` accept header.
   *
   * If a team doesn't have permission for the repository, you will receive a `404 Not Found` response status.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCheckPermissionsForRepoInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsCheckPermissionsForRepoInOrg$Response(params: TeamsCheckPermissionsForRepoInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamRepository>> {
    return teamsCheckPermissionsForRepoInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Check team permissions for a repository.
   *
   * Checks whether a team has `admin`, `push`, `maintain`, `triage`, or `pull` permission for a repository. Repositories inherited through a parent team will also be checked.
   *
   * You can also get information about the specified repository, including what permissions the team grants on it, by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `application/vnd.github.v3.repository+json` accept header.
   *
   * If a team doesn't have permission for the repository, you will receive a `404 Not Found` response status.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCheckPermissionsForRepoInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsCheckPermissionsForRepoInOrg(params: TeamsCheckPermissionsForRepoInOrg$Params, context?: HttpContext): Observable<TeamRepository> {
    return this.teamsCheckPermissionsForRepoInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamRepository>): TeamRepository => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateRepoPermissionsInOrg()` */
  static readonly TeamsAddOrUpdateRepoPermissionsInOrgPath = '/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}';

  /**
   * Add or update team repository permissions.
   *
   * To add a repository to a team or update the team's permission on a repository, the authenticated user must have admin access to the repository, and must be able to see the team. The repository must be owned by the organization, or a direct fork of a repository owned by the organization. You will get a `422 Unprocessable Entity` status if you attempt to add a repository to a team that is not owned by the organization. Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * For more information about the permission levels, see "[Repository permission levels for an organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/repository-permission-levels-for-an-organization#permission-levels-for-repositories-owned-by-an-organization)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateRepoPermissionsInOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateRepoPermissionsInOrg$Response(params: TeamsAddOrUpdateRepoPermissionsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsAddOrUpdateRepoPermissionsInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team repository permissions.
   *
   * To add a repository to a team or update the team's permission on a repository, the authenticated user must have admin access to the repository, and must be able to see the team. The repository must be owned by the organization, or a direct fork of a repository owned by the organization. You will get a `422 Unprocessable Entity` status if you attempt to add a repository to a team that is not owned by the organization. Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `PUT /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * For more information about the permission levels, see "[Repository permission levels for an organization](https://docs.github.com/github/setting-up-and-managing-organizations-and-teams/repository-permission-levels-for-an-organization#permission-levels-for-repositories-owned-by-an-organization)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateRepoPermissionsInOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teamsAddOrUpdateRepoPermissionsInOrg(params: TeamsAddOrUpdateRepoPermissionsInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsAddOrUpdateRepoPermissionsInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsRemoveRepoInOrg()` */
  static readonly TeamsRemoveRepoInOrgPath = '/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}';

  /**
   * Remove a repository from a team.
   *
   * If the authenticated user is an organization owner or a team maintainer, they can remove any repositories from the team. To remove a repository from a team as an organization member, the authenticated user must have admin access to the repository and must be able to see the team. This does not delete the repository, it just removes it from the team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveRepoInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveRepoInOrg$Response(params: TeamsRemoveRepoInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveRepoInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a repository from a team.
   *
   * If the authenticated user is an organization owner or a team maintainer, they can remove any repositories from the team. To remove a repository from a team as an organization member, the authenticated user must have admin access to the repository and must be able to see the team. This does not delete the repository, it just removes it from the team.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `DELETE /organizations/{org_id}/team/{team_id}/repos/{owner}/{repo}`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveRepoInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsRemoveRepoInOrg(params: TeamsRemoveRepoInOrg$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveRepoInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListChildInOrg()` */
  static readonly TeamsListChildInOrgPath = '/orgs/{org}/teams/{team_slug}/teams';

  /**
   * List child teams.
   *
   * Lists the child teams of the team specified by `{team_slug}`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/teams`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListChildInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListChildInOrg$Response(params: TeamsListChildInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return teamsListChildInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List child teams.
   *
   * Lists the child teams of the team specified by `{team_slug}`.
   *
   * **Note:** You can also specify a team by `org_id` and `team_id` using the route `GET /organizations/{org_id}/team/{team_id}/teams`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListChildInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListChildInOrg(params: TeamsListChildInOrg$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.teamsListChildInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `teamsGetLegacy()` */
  static readonly TeamsGetLegacyPath = '/teams/{team_id}';

  /**
   * Get a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the [Get a team by name](https://docs.github.com/rest/teams/teams#get-a-team-by-name) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetLegacy$Response(params: TeamsGetLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
    return teamsGetLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the [Get a team by name](https://docs.github.com/rest/teams/teams#get-a-team-by-name) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetLegacy(params: TeamsGetLegacy$Params, context?: HttpContext): Observable<TeamFull> {
    return this.teamsGetLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamFull>): TeamFull => r.body)
    );
  }

  /** Path part for operation `teamsDeleteLegacy()` */
  static readonly TeamsDeleteLegacyPath = '/teams/{team_id}';

  /**
   * Delete a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Delete a team](https://docs.github.com/rest/teams/teams#delete-a-team) endpoint.
   *
   * To delete a team, the authenticated user must be an organization owner or team maintainer.
   *
   * If you are an organization owner, deleting a parent team will delete all of its child teams as well.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteLegacy$Response(params: TeamsDeleteLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Delete a team](https://docs.github.com/rest/teams/teams#delete-a-team) endpoint.
   *
   * To delete a team, the authenticated user must be an organization owner or team maintainer.
   *
   * If you are an organization owner, deleting a parent team will delete all of its child teams as well.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteLegacy(params: TeamsDeleteLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateLegacy()` */
  static readonly TeamsUpdateLegacyPath = '/teams/{team_id}';

  /**
   * Update a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a team](https://docs.github.com/rest/teams/teams#update-a-team) endpoint.
   *
   * To edit a team, the authenticated user must either be an organization owner or a team maintainer.
   *
   * **Note:** With nested teams, the `privacy` for parent teams cannot be `secret`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateLegacy$Response(params: TeamsUpdateLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
    return teamsUpdateLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a team](https://docs.github.com/rest/teams/teams#update-a-team) endpoint.
   *
   * To edit a team, the authenticated user must either be an organization owner or a team maintainer.
   *
   * **Note:** With nested teams, the `privacy` for parent teams cannot be `secret`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateLegacy(params: TeamsUpdateLegacy$Params, context?: HttpContext): Observable<TeamFull> {
    return this.teamsUpdateLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamFull>): TeamFull => r.body)
    );
  }

  /** Path part for operation `teamsListDiscussionsLegacy()` */
  static readonly TeamsListDiscussionsLegacyPath = '/teams/{team_id}/discussions';

  /**
   * List discussions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List discussions`](https://docs.github.com/rest/teams/discussions#list-discussions) endpoint.
   *
   * List all discussions on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListDiscussionsLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListDiscussionsLegacy$Response(params: TeamsListDiscussionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamDiscussion>>> {
    return teamsListDiscussionsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List discussions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List discussions`](https://docs.github.com/rest/teams/discussions#list-discussions) endpoint.
   *
   * List all discussions on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListDiscussionsLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListDiscussionsLegacy(params: TeamsListDiscussionsLegacy$Params, context?: HttpContext): Observable<Array<TeamDiscussion>> {
    return this.teamsListDiscussionsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamDiscussion>>): Array<TeamDiscussion> => r.body)
    );
  }

  /** Path part for operation `teamsCreateDiscussionLegacy()` */
  static readonly TeamsCreateDiscussionLegacyPath = '/teams/{team_id}/discussions';

  /**
   * Create a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Create a discussion`](https://docs.github.com/rest/teams/discussions#create-a-discussion) endpoint.
   *
   * Creates a new discussion post on a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCreateDiscussionLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsCreateDiscussionLegacy$Response(params: TeamsCreateDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsCreateDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Create a discussion`](https://docs.github.com/rest/teams/discussions#create-a-discussion) endpoint.
   *
   * Creates a new discussion post on a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCreateDiscussionLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsCreateDiscussionLegacy(params: TeamsCreateDiscussionLegacy$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsCreateDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsGetDiscussionLegacy()` */
  static readonly TeamsGetDiscussionLegacyPath = '/teams/{team_id}/discussions/{discussion_number}';

  /**
   * Get a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get a discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion) endpoint.
   *
   * Get a specific discussion on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetDiscussionLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetDiscussionLegacy$Response(params: TeamsGetDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsGetDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get a discussion](https://docs.github.com/rest/teams/discussions#get-a-discussion) endpoint.
   *
   * Get a specific discussion on a team's page. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetDiscussionLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetDiscussionLegacy(params: TeamsGetDiscussionLegacy$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsGetDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsDeleteDiscussionLegacy()` */
  static readonly TeamsDeleteDiscussionLegacyPath = '/teams/{team_id}/discussions/{discussion_number}';

  /**
   * Delete a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Delete a discussion`](https://docs.github.com/rest/teams/discussions#delete-a-discussion) endpoint.
   *
   * Delete a discussion from a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteDiscussionLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteDiscussionLegacy$Response(params: TeamsDeleteDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`Delete a discussion`](https://docs.github.com/rest/teams/discussions#delete-a-discussion) endpoint.
   *
   * Delete a discussion from a team's page. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteDiscussionLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteDiscussionLegacy(params: TeamsDeleteDiscussionLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateDiscussionLegacy()` */
  static readonly TeamsUpdateDiscussionLegacyPath = '/teams/{team_id}/discussions/{discussion_number}';

  /**
   * Update a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a discussion](https://docs.github.com/rest/teams/discussions#update-a-discussion) endpoint.
   *
   * Edits the title and body text of a discussion post. Only the parameters you provide are updated. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateDiscussionLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateDiscussionLegacy$Response(params: TeamsUpdateDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
    return teamsUpdateDiscussionLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a discussion (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a discussion](https://docs.github.com/rest/teams/discussions#update-a-discussion) endpoint.
   *
   * Edits the title and body text of a discussion post. Only the parameters you provide are updated. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateDiscussionLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateDiscussionLegacy(params: TeamsUpdateDiscussionLegacy$Params, context?: HttpContext): Observable<TeamDiscussion> {
    return this.teamsUpdateDiscussionLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussion>): TeamDiscussion => r.body)
    );
  }

  /** Path part for operation `teamsListDiscussionCommentsLegacy()` */
  static readonly TeamsListDiscussionCommentsLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments';

  /**
   * List discussion comments (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [List discussion comments](https://docs.github.com/rest/teams/discussion-comments#list-discussion-comments) endpoint.
   *
   * List all comments on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListDiscussionCommentsLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListDiscussionCommentsLegacy$Response(params: TeamsListDiscussionCommentsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamDiscussionComment>>> {
    return teamsListDiscussionCommentsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List discussion comments (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [List discussion comments](https://docs.github.com/rest/teams/discussion-comments#list-discussion-comments) endpoint.
   *
   * List all comments on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListDiscussionCommentsLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListDiscussionCommentsLegacy(params: TeamsListDiscussionCommentsLegacy$Params, context?: HttpContext): Observable<Array<TeamDiscussionComment>> {
    return this.teamsListDiscussionCommentsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamDiscussionComment>>): Array<TeamDiscussionComment> => r.body)
    );
  }

  /** Path part for operation `teamsCreateDiscussionCommentLegacy()` */
  static readonly TeamsCreateDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments';

  /**
   * Create a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Create a discussion comment](https://docs.github.com/rest/teams/discussion-comments#create-a-discussion-comment) endpoint.
   *
   * Creates a new comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCreateDiscussionCommentLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsCreateDiscussionCommentLegacy$Response(params: TeamsCreateDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsCreateDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Create a discussion comment](https://docs.github.com/rest/teams/discussion-comments#create-a-discussion-comment) endpoint.
   *
   * Creates a new comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. See "[Secondary rate limits](https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits)" and "[Dealing with secondary rate limits](https://docs.github.com/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits)" for details.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCreateDiscussionCommentLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsCreateDiscussionCommentLegacy(params: TeamsCreateDiscussionCommentLegacy$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsCreateDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsGetDiscussionCommentLegacy()` */
  static readonly TeamsGetDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Get a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get a discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment) endpoint.
   *
   * Get a specific comment on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetDiscussionCommentLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetDiscussionCommentLegacy$Response(params: TeamsGetDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsGetDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get a discussion comment](https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment) endpoint.
   *
   * Get a specific comment on a team discussion. OAuth access tokens require the `read:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetDiscussionCommentLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetDiscussionCommentLegacy(params: TeamsGetDiscussionCommentLegacy$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsGetDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsDeleteDiscussionCommentLegacy()` */
  static readonly TeamsDeleteDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Delete a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Delete a discussion comment](https://docs.github.com/rest/teams/discussion-comments#delete-a-discussion-comment) endpoint.
   *
   * Deletes a comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsDeleteDiscussionCommentLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteDiscussionCommentLegacy$Response(params: TeamsDeleteDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsDeleteDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Delete a discussion comment](https://docs.github.com/rest/teams/discussion-comments#delete-a-discussion-comment) endpoint.
   *
   * Deletes a comment on a team discussion. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsDeleteDiscussionCommentLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsDeleteDiscussionCommentLegacy(params: TeamsDeleteDiscussionCommentLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsDeleteDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsUpdateDiscussionCommentLegacy()` */
  static readonly TeamsUpdateDiscussionCommentLegacyPath = '/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}';

  /**
   * Update a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a discussion comment](https://docs.github.com/rest/teams/discussion-comments#update-a-discussion-comment) endpoint.
   *
   * Edits the body text of a discussion comment. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsUpdateDiscussionCommentLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateDiscussionCommentLegacy$Response(params: TeamsUpdateDiscussionCommentLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussionComment>> {
    return teamsUpdateDiscussionCommentLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a discussion comment (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Update a discussion comment](https://docs.github.com/rest/teams/discussion-comments#update-a-discussion-comment) endpoint.
   *
   * Edits the body text of a discussion comment. OAuth access tokens require the `write:discussion` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsUpdateDiscussionCommentLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsUpdateDiscussionCommentLegacy(params: TeamsUpdateDiscussionCommentLegacy$Params, context?: HttpContext): Observable<TeamDiscussionComment> {
    return this.teamsUpdateDiscussionCommentLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamDiscussionComment>): TeamDiscussionComment => r.body)
    );
  }

  /** Path part for operation `teamsListPendingInvitationsLegacy()` */
  static readonly TeamsListPendingInvitationsLegacyPath = '/teams/{team_id}/invitations';

  /**
   * List pending team invitations (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List pending team invitations`](https://docs.github.com/rest/teams/members#list-pending-team-invitations) endpoint.
   *
   * The return hash contains a `role` field which refers to the Organization Invitation role and will be one of the following values: `direct_member`, `admin`, `billing_manager`, `hiring_manager`, or `reinstate`. If the invitee is not a GitHub member, the `login` field in the return hash will be `null`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListPendingInvitationsLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListPendingInvitationsLegacy$Response(params: TeamsListPendingInvitationsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationInvitation>>> {
    return teamsListPendingInvitationsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List pending team invitations (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List pending team invitations`](https://docs.github.com/rest/teams/members#list-pending-team-invitations) endpoint.
   *
   * The return hash contains a `role` field which refers to the Organization Invitation role and will be one of the following values: `direct_member`, `admin`, `billing_manager`, `hiring_manager`, or `reinstate`. If the invitee is not a GitHub member, the `login` field in the return hash will be `null`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListPendingInvitationsLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListPendingInvitationsLegacy(params: TeamsListPendingInvitationsLegacy$Params, context?: HttpContext): Observable<Array<OrganizationInvitation>> {
    return this.teamsListPendingInvitationsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<OrganizationInvitation>>): Array<OrganizationInvitation> => r.body)
    );
  }

  /** Path part for operation `teamsListMembersLegacy()` */
  static readonly TeamsListMembersLegacyPath = '/teams/{team_id}/members';

  /**
   * List team members (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List team members`](https://docs.github.com/rest/teams/members#list-team-members) endpoint.
   *
   * Team members will include the members of child teams.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListMembersLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListMembersLegacy$Response(params: TeamsListMembersLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return teamsListMembersLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List team members (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List team members`](https://docs.github.com/rest/teams/members#list-team-members) endpoint.
   *
   * Team members will include the members of child teams.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListMembersLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListMembersLegacy(params: TeamsListMembersLegacy$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.teamsListMembersLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `teamsGetMemberLegacy()` */
  static readonly TeamsGetMemberLegacyPath = '/teams/{team_id}/members/{username}';

  /**
   * Get team member (Legacy).
   *
   * The "Get team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Get team membership for a user](https://docs.github.com/rest/teams/members#get-team-membership-for-a-user) endpoint instead. It allows you to get both active and pending memberships.
   *
   * To list members in a team, the team must be visible to the authenticated user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetMemberLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetMemberLegacy$Response(params: TeamsGetMemberLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsGetMemberLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get team member (Legacy).
   *
   * The "Get team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Get team membership for a user](https://docs.github.com/rest/teams/members#get-team-membership-for-a-user) endpoint instead. It allows you to get both active and pending memberships.
   *
   * To list members in a team, the team must be visible to the authenticated user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetMemberLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetMemberLegacy(params: TeamsGetMemberLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsGetMemberLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsAddMemberLegacy()` */
  static readonly TeamsAddMemberLegacyPath = '/teams/{team_id}/members/{username}';

  /**
   * Add team member (Legacy).
   *
   * The "Add team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Add or update team membership for a user](https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user) endpoint instead. It allows you to invite new organization members to your teams.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To add someone to a team, the authenticated user must be an organization owner or a team maintainer in the team they're changing. The person being added to the team must be a member of the team's organization.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddMemberLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsAddMemberLegacy$Response(params: TeamsAddMemberLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsAddMemberLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Add team member (Legacy).
   *
   * The "Add team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Add or update team membership for a user](https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user) endpoint instead. It allows you to invite new organization members to your teams.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To add someone to a team, the authenticated user must be an organization owner or a team maintainer in the team they're changing. The person being added to the team must be a member of the team's organization.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * Note that you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddMemberLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsAddMemberLegacy(params: TeamsAddMemberLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsAddMemberLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsRemoveMemberLegacy()` */
  static readonly TeamsRemoveMemberLegacyPath = '/teams/{team_id}/members/{username}';

  /**
   * Remove team member (Legacy).
   *
   * The "Remove team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Remove team membership for a user](https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user) endpoint instead. It allows you to remove both active and pending memberships.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To remove a team member, the authenticated user must have 'admin' permissions to the team or be an owner of the org that the team is associated with. Removing a team member does not delete the user, it just removes them from the team.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveMemberLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveMemberLegacy$Response(params: TeamsRemoveMemberLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveMemberLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove team member (Legacy).
   *
   * The "Remove team member" endpoint (described below) is deprecated.
   *
   * We recommend using the [Remove team membership for a user](https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user) endpoint instead. It allows you to remove both active and pending memberships.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To remove a team member, the authenticated user must have 'admin' permissions to the team or be an owner of the org that the team is associated with. Removing a team member does not delete the user, it just removes them from the team.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveMemberLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveMemberLegacy(params: TeamsRemoveMemberLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveMemberLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsGetMembershipForUserLegacy()` */
  static readonly TeamsGetMembershipForUserLegacyPath = '/teams/{team_id}/memberships/{username}';

  /**
   * Get team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get team membership for a user](https://docs.github.com/rest/teams/members#get-team-membership-for-a-user) endpoint.
   *
   * Team members will include the members of child teams.
   *
   * To get a user's membership with a team, the team must be visible to the authenticated user.
   *
   * **Note:**
   * The response contains the `state` of the membership and the member's `role`.
   *
   * The `role` for organization owners is set to `maintainer`. For more information about `maintainer` roles, see [Create a team](https://docs.github.com/rest/teams/teams#create-a-team).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsGetMembershipForUserLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetMembershipForUserLegacy$Response(params: TeamsGetMembershipForUserLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
    return teamsGetMembershipForUserLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Get team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Get team membership for a user](https://docs.github.com/rest/teams/members#get-team-membership-for-a-user) endpoint.
   *
   * Team members will include the members of child teams.
   *
   * To get a user's membership with a team, the team must be visible to the authenticated user.
   *
   * **Note:**
   * The response contains the `state` of the membership and the member's `role`.
   *
   * The `role` for organization owners is set to `maintainer`. For more information about `maintainer` roles, see [Create a team](https://docs.github.com/rest/teams/teams#create-a-team).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsGetMembershipForUserLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsGetMembershipForUserLegacy(params: TeamsGetMembershipForUserLegacy$Params, context?: HttpContext): Observable<TeamMembership> {
    return this.teamsGetMembershipForUserLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamMembership>): TeamMembership => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateMembershipForUserLegacy()` */
  static readonly TeamsAddOrUpdateMembershipForUserLegacyPath = '/teams/{team_id}/memberships/{username}';

  /**
   * Add or update team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Add or update team membership for a user](https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user) endpoint.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * If the user is already a member of the team's organization, this endpoint will add the user to the team. To add a membership between an organization member and a team, the authenticated user must be an organization owner or a team maintainer.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * If the user is unaffiliated with the team's organization, this endpoint will send an invitation to the user via email. This newly-created membership will be in the "pending" state until the user accepts the invitation, at which point the membership will transition to the "active" state and the user will be added as a member of the team. To add a membership between an unaffiliated user and a team, the authenticated user must be an organization owner.
   *
   * If the user is already a member of the team, this endpoint will update the role of the team member's role. To update the membership of a team member, the authenticated user must be an organization owner or a team maintainer.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateMembershipForUserLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateMembershipForUserLegacy$Response(params: TeamsAddOrUpdateMembershipForUserLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
    return teamsAddOrUpdateMembershipForUserLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Add or update team membership for a user](https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user) endpoint.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * If the user is already a member of the team's organization, this endpoint will add the user to the team. To add a membership between an organization member and a team, the authenticated user must be an organization owner or a team maintainer.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * If the user is unaffiliated with the team's organization, this endpoint will send an invitation to the user via email. This newly-created membership will be in the "pending" state until the user accepts the invitation, at which point the membership will transition to the "active" state and the user will be added as a member of the team. To add a membership between an unaffiliated user and a team, the authenticated user must be an organization owner.
   *
   * If the user is already a member of the team, this endpoint will update the role of the team member's role. To update the membership of a team member, the authenticated user must be an organization owner or a team maintainer.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateMembershipForUserLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateMembershipForUserLegacy(params: TeamsAddOrUpdateMembershipForUserLegacy$Params, context?: HttpContext): Observable<TeamMembership> {
    return this.teamsAddOrUpdateMembershipForUserLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamMembership>): TeamMembership => r.body)
    );
  }

  /** Path part for operation `teamsRemoveMembershipForUserLegacy()` */
  static readonly TeamsRemoveMembershipForUserLegacyPath = '/teams/{team_id}/memberships/{username}';

  /**
   * Remove team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove team membership for a user](https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user) endpoint.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To remove a membership between a user and a team, the authenticated user must have 'admin' permissions to the team or be an owner of the organization that the team is associated with. Removing team membership does not delete the user, it just removes their membership from the team.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveMembershipForUserLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveMembershipForUserLegacy$Response(params: TeamsRemoveMembershipForUserLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveMembershipForUserLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove team membership for a user (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove team membership for a user](https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user) endpoint.
   *
   * Team synchronization is available for organizations using GitHub Enterprise Cloud. For more information, see [GitHub's products](https://docs.github.com/github/getting-started-with-github/githubs-products) in the GitHub Help documentation.
   *
   * To remove a membership between a user and a team, the authenticated user must have 'admin' permissions to the team or be an owner of the organization that the team is associated with. Removing team membership does not delete the user, it just removes their membership from the team.
   *
   * **Note:** When you have team synchronization set up for a team with your organization's identity provider (IdP), you will see an error if you attempt to use the API for making changes to the team's membership. If you have access to manage group membership in your IdP, you can manage GitHub team membership through your identity provider, which automatically adds and removes team members in an organization. For more information, see "[Synchronizing teams between your identity provider and GitHub](https://docs.github.com/articles/synchronizing-teams-between-your-identity-provider-and-github/)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveMembershipForUserLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveMembershipForUserLegacy(params: TeamsRemoveMembershipForUserLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveMembershipForUserLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListProjectsLegacy()` */
  static readonly TeamsListProjectsLegacyPath = '/teams/{team_id}/projects';

  /**
   * List team projects (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List team projects`](https://docs.github.com/rest/teams/teams#list-team-projects) endpoint.
   *
   * Lists the organization projects for a team.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListProjectsLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListProjectsLegacy$Response(params: TeamsListProjectsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamProject>>> {
    return teamsListProjectsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List team projects (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List team projects`](https://docs.github.com/rest/teams/teams#list-team-projects) endpoint.
   *
   * Lists the organization projects for a team.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListProjectsLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListProjectsLegacy(params: TeamsListProjectsLegacy$Params, context?: HttpContext): Observable<Array<TeamProject>> {
    return this.teamsListProjectsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamProject>>): Array<TeamProject> => r.body)
    );
  }

  /** Path part for operation `teamsCheckPermissionsForProjectLegacy()` */
  static readonly TeamsCheckPermissionsForProjectLegacyPath = '/teams/{team_id}/projects/{project_id}';

  /**
   * Check team permissions for a project (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Check team permissions for a project](https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-project) endpoint.
   *
   * Checks whether a team has `read`, `write`, or `admin` permissions for an organization project. The response includes projects inherited from a parent team.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCheckPermissionsForProjectLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsCheckPermissionsForProjectLegacy$Response(params: TeamsCheckPermissionsForProjectLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamProject>> {
    return teamsCheckPermissionsForProjectLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Check team permissions for a project (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Check team permissions for a project](https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-project) endpoint.
   *
   * Checks whether a team has `read`, `write`, or `admin` permissions for an organization project. The response includes projects inherited from a parent team.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCheckPermissionsForProjectLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsCheckPermissionsForProjectLegacy(params: TeamsCheckPermissionsForProjectLegacy$Params, context?: HttpContext): Observable<TeamProject> {
    return this.teamsCheckPermissionsForProjectLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamProject>): TeamProject => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateProjectPermissionsLegacy()` */
  static readonly TeamsAddOrUpdateProjectPermissionsLegacyPath = '/teams/{team_id}/projects/{project_id}';

  /**
   * Add or update team project permissions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Add or update team project permissions](https://docs.github.com/rest/teams/teams#add-or-update-team-project-permissions) endpoint.
   *
   * Adds an organization project to a team. To add a project to a team or update the team's permission on a project, the authenticated user must have `admin` permissions for the project. The project and team must be part of the same organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateProjectPermissionsLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateProjectPermissionsLegacy$Response(params: TeamsAddOrUpdateProjectPermissionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsAddOrUpdateProjectPermissionsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team project permissions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Add or update team project permissions](https://docs.github.com/rest/teams/teams#add-or-update-team-project-permissions) endpoint.
   *
   * Adds an organization project to a team. To add a project to a team or update the team's permission on a project, the authenticated user must have `admin` permissions for the project. The project and team must be part of the same organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateProjectPermissionsLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateProjectPermissionsLegacy(params: TeamsAddOrUpdateProjectPermissionsLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsAddOrUpdateProjectPermissionsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsRemoveProjectLegacy()` */
  static readonly TeamsRemoveProjectLegacyPath = '/teams/{team_id}/projects/{project_id}';

  /**
   * Remove a project from a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove a project from a team](https://docs.github.com/rest/teams/teams#remove-a-project-from-a-team) endpoint.
   *
   * Removes an organization project from a team. An organization owner or a team maintainer can remove any project from the team. To remove a project from a team as an organization member, the authenticated user must have `read` access to both the team and project, or `admin` access to the team or project. **Note:** This endpoint removes the project from the team, but does not delete it.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveProjectLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveProjectLegacy$Response(params: TeamsRemoveProjectLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveProjectLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a project from a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove a project from a team](https://docs.github.com/rest/teams/teams#remove-a-project-from-a-team) endpoint.
   *
   * Removes an organization project from a team. An organization owner or a team maintainer can remove any project from the team. To remove a project from a team as an organization member, the authenticated user must have `read` access to both the team and project, or `admin` access to the team or project. **Note:** This endpoint removes the project from the team, but does not delete it.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveProjectLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveProjectLegacy(params: TeamsRemoveProjectLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveProjectLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListReposLegacy()` */
  static readonly TeamsListReposLegacyPath = '/teams/{team_id}/repos';

  /**
   * List team repositories (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [List team repositories](https://docs.github.com/rest/teams/teams#list-team-repositories) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListReposLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListReposLegacy$Response(params: TeamsListReposLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
    return teamsListReposLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List team repositories (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [List team repositories](https://docs.github.com/rest/teams/teams#list-team-repositories) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListReposLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListReposLegacy(params: TeamsListReposLegacy$Params, context?: HttpContext): Observable<Array<MinimalRepository>> {
    return this.teamsListReposLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MinimalRepository>>): Array<MinimalRepository> => r.body)
    );
  }

  /** Path part for operation `teamsCheckPermissionsForRepoLegacy()` */
  static readonly TeamsCheckPermissionsForRepoLegacyPath = '/teams/{team_id}/repos/{owner}/{repo}';

  /**
   * Check team permissions for a repository (Legacy).
   *
   * **Note**: Repositories inherited through a parent team will also be checked.
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Check team permissions for a repository](https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-repository) endpoint.
   *
   * You can also get information about the specified repository, including what permissions the team grants on it, by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header:
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsCheckPermissionsForRepoLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsCheckPermissionsForRepoLegacy$Response(params: TeamsCheckPermissionsForRepoLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamRepository>> {
    return teamsCheckPermissionsForRepoLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Check team permissions for a repository (Legacy).
   *
   * **Note**: Repositories inherited through a parent team will also be checked.
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Check team permissions for a repository](https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-repository) endpoint.
   *
   * You can also get information about the specified repository, including what permissions the team grants on it, by passing the following custom [media type](https://docs.github.com/rest/overview/media-types/) via the `Accept` header:
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsCheckPermissionsForRepoLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsCheckPermissionsForRepoLegacy(params: TeamsCheckPermissionsForRepoLegacy$Params, context?: HttpContext): Observable<TeamRepository> {
    return this.teamsCheckPermissionsForRepoLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<TeamRepository>): TeamRepository => r.body)
    );
  }

  /** Path part for operation `teamsAddOrUpdateRepoPermissionsLegacy()` */
  static readonly TeamsAddOrUpdateRepoPermissionsLegacyPath = '/teams/{team_id}/repos/{owner}/{repo}';

  /**
   * Add or update team repository permissions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new "[Add or update team repository permissions](https://docs.github.com/rest/teams/teams#add-or-update-team-repository-permissions)" endpoint.
   *
   * To add a repository to a team or update the team's permission on a repository, the authenticated user must have admin access to the repository, and must be able to see the team. The repository must be owned by the organization, or a direct fork of a repository owned by the organization. You will get a `422 Unprocessable Entity` status if you attempt to add a repository to a team that is not owned by the organization.
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsAddOrUpdateRepoPermissionsLegacy()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateRepoPermissionsLegacy$Response(params: TeamsAddOrUpdateRepoPermissionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsAddOrUpdateRepoPermissionsLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Add or update team repository permissions (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new "[Add or update team repository permissions](https://docs.github.com/rest/teams/teams#add-or-update-team-repository-permissions)" endpoint.
   *
   * To add a repository to a team or update the team's permission on a repository, the authenticated user must have admin access to the repository, and must be able to see the team. The repository must be owned by the organization, or a direct fork of a repository owned by the organization. You will get a `422 Unprocessable Entity` status if you attempt to add a repository to a team that is not owned by the organization.
   *
   * Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling out to this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsAddOrUpdateRepoPermissionsLegacy$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  teamsAddOrUpdateRepoPermissionsLegacy(params: TeamsAddOrUpdateRepoPermissionsLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsAddOrUpdateRepoPermissionsLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsRemoveRepoLegacy()` */
  static readonly TeamsRemoveRepoLegacyPath = '/teams/{team_id}/repos/{owner}/{repo}';

  /**
   * Remove a repository from a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove a repository from a team](https://docs.github.com/rest/teams/teams#remove-a-repository-from-a-team) endpoint.
   *
   * If the authenticated user is an organization owner or a team maintainer, they can remove any repositories from the team. To remove a repository from a team as an organization member, the authenticated user must have admin access to the repository and must be able to see the team. NOTE: This does not delete the repository, it just removes it from the team.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsRemoveRepoLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveRepoLegacy$Response(params: TeamsRemoveRepoLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teamsRemoveRepoLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a repository from a team (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [Remove a repository from a team](https://docs.github.com/rest/teams/teams#remove-a-repository-from-a-team) endpoint.
   *
   * If the authenticated user is an organization owner or a team maintainer, they can remove any repositories from the team. To remove a repository from a team as an organization member, the authenticated user must have admin access to the repository and must be able to see the team. NOTE: This does not delete the repository, it just removes it from the team.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsRemoveRepoLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsRemoveRepoLegacy(params: TeamsRemoveRepoLegacy$Params, context?: HttpContext): Observable<void> {
    return this.teamsRemoveRepoLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `teamsListChildLegacy()` */
  static readonly TeamsListChildLegacyPath = '/teams/{team_id}/teams';

  /**
   * List child teams (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List child teams`](https://docs.github.com/rest/teams/teams#list-child-teams) endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListChildLegacy()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListChildLegacy$Response(params: TeamsListChildLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
    return teamsListChildLegacy(this.http, this.rootUrl, params, context);
  }

  /**
   * List child teams (Legacy).
   *
   * **Deprecation Notice:** This endpoint route is deprecated and will be removed from the Teams API. We recommend migrating your existing code to use the new [`List child teams`](https://docs.github.com/rest/teams/teams#list-child-teams) endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListChildLegacy$Response()` instead.
   *
   * This method doesn't expect any request body.
   *
   * @deprecated
   */
  teamsListChildLegacy(params: TeamsListChildLegacy$Params, context?: HttpContext): Observable<Array<Team>> {
    return this.teamsListChildLegacy$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Team>>): Array<Team> => r.body)
    );
  }

  /** Path part for operation `teamsListForAuthenticatedUser()` */
  static readonly TeamsListForAuthenticatedUserPath = '/user/teams';

  /**
   * List teams for the authenticated user.
   *
   * List all of the teams across all of the organizations to which the authenticated user belongs. This method requires `user`, `repo`, or `read:org` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/) when authenticating via [OAuth](https://docs.github.com/apps/building-oauth-apps/). When using a fine-grained personal access token, the resource owner of the token [must be a single organization](https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#fine-grained-personal-access-tokens), and have at least read-only member organization permissions. The response payload only contains the teams from a single organization when using a fine-grained personal access token.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teamsListForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListForAuthenticatedUser$Response(params?: TeamsListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamFull>>> {
    return teamsListForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List teams for the authenticated user.
   *
   * List all of the teams across all of the organizations to which the authenticated user belongs. This method requires `user`, `repo`, or `read:org` [scope](https://docs.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/) when authenticating via [OAuth](https://docs.github.com/apps/building-oauth-apps/). When using a fine-grained personal access token, the resource owner of the token [must be a single organization](https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#fine-grained-personal-access-tokens), and have at least read-only member organization permissions. The response payload only contains the teams from a single organization when using a fine-grained personal access token.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teamsListForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teamsListForAuthenticatedUser(params?: TeamsListForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<TeamFull>> {
    return this.teamsListForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<TeamFull>>): Array<TeamFull> => r.body)
    );
  }

}
