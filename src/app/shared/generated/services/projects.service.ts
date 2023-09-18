/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Project } from '../models/project';
import { ProjectCard } from '../models/project-card';
import { ProjectCollaboratorPermission } from '../models/project-collaborator-permission';
import { ProjectColumn } from '../models/project-column';
import { projectsAddCollaborator } from '../fn/projects/projects-add-collaborator';
import { ProjectsAddCollaborator$Params } from '../fn/projects/projects-add-collaborator';
import { projectsCreateCard } from '../fn/projects/projects-create-card';
import { ProjectsCreateCard$Params } from '../fn/projects/projects-create-card';
import { projectsCreateColumn } from '../fn/projects/projects-create-column';
import { ProjectsCreateColumn$Params } from '../fn/projects/projects-create-column';
import { projectsCreateForAuthenticatedUser } from '../fn/projects/projects-create-for-authenticated-user';
import { ProjectsCreateForAuthenticatedUser$Params } from '../fn/projects/projects-create-for-authenticated-user';
import { projectsCreateForOrg } from '../fn/projects/projects-create-for-org';
import { ProjectsCreateForOrg$Params } from '../fn/projects/projects-create-for-org';
import { projectsCreateForRepo } from '../fn/projects/projects-create-for-repo';
import { ProjectsCreateForRepo$Params } from '../fn/projects/projects-create-for-repo';
import { projectsDelete } from '../fn/projects/projects-delete';
import { ProjectsDelete$Params } from '../fn/projects/projects-delete';
import { projectsDeleteCard } from '../fn/projects/projects-delete-card';
import { ProjectsDeleteCard$Params } from '../fn/projects/projects-delete-card';
import { projectsDeleteColumn } from '../fn/projects/projects-delete-column';
import { ProjectsDeleteColumn$Params } from '../fn/projects/projects-delete-column';
import { projectsGet } from '../fn/projects/projects-get';
import { ProjectsGet$Params } from '../fn/projects/projects-get';
import { projectsGetCard } from '../fn/projects/projects-get-card';
import { ProjectsGetCard$Params } from '../fn/projects/projects-get-card';
import { projectsGetColumn } from '../fn/projects/projects-get-column';
import { ProjectsGetColumn$Params } from '../fn/projects/projects-get-column';
import { projectsGetPermissionForUser } from '../fn/projects/projects-get-permission-for-user';
import { ProjectsGetPermissionForUser$Params } from '../fn/projects/projects-get-permission-for-user';
import { projectsListCards } from '../fn/projects/projects-list-cards';
import { ProjectsListCards$Params } from '../fn/projects/projects-list-cards';
import { projectsListCollaborators } from '../fn/projects/projects-list-collaborators';
import { ProjectsListCollaborators$Params } from '../fn/projects/projects-list-collaborators';
import { projectsListColumns } from '../fn/projects/projects-list-columns';
import { ProjectsListColumns$Params } from '../fn/projects/projects-list-columns';
import { projectsListForOrg } from '../fn/projects/projects-list-for-org';
import { ProjectsListForOrg$Params } from '../fn/projects/projects-list-for-org';
import { projectsListForRepo } from '../fn/projects/projects-list-for-repo';
import { ProjectsListForRepo$Params } from '../fn/projects/projects-list-for-repo';
import { projectsListForUser } from '../fn/projects/projects-list-for-user';
import { ProjectsListForUser$Params } from '../fn/projects/projects-list-for-user';
import { projectsMoveCard } from '../fn/projects/projects-move-card';
import { ProjectsMoveCard$Params } from '../fn/projects/projects-move-card';
import { projectsMoveColumn } from '../fn/projects/projects-move-column';
import { ProjectsMoveColumn$Params } from '../fn/projects/projects-move-column';
import { projectsRemoveCollaborator } from '../fn/projects/projects-remove-collaborator';
import { ProjectsRemoveCollaborator$Params } from '../fn/projects/projects-remove-collaborator';
import { projectsUpdate } from '../fn/projects/projects-update';
import { ProjectsUpdate$Params } from '../fn/projects/projects-update';
import { projectsUpdateCard } from '../fn/projects/projects-update-card';
import { ProjectsUpdateCard$Params } from '../fn/projects/projects-update-card';
import { projectsUpdateColumn } from '../fn/projects/projects-update-column';
import { ProjectsUpdateColumn$Params } from '../fn/projects/projects-update-column';
import { SimpleUser } from '../models/simple-user';


/**
 * Interact with GitHub Projects.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `projectsListForOrg()` */
  static readonly ProjectsListForOrgPath = '/orgs/{org}/projects';

  /**
   * List organization projects.
   *
   * Lists the projects in an organization. Returns a `404 Not Found` status if projects are disabled in the organization. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForOrg$Response(params: ProjectsListForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Project>>> {
    return projectsListForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization projects.
   *
   * Lists the projects in an organization. Returns a `404 Not Found` status if projects are disabled in the organization. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForOrg(params: ProjectsListForOrg$Params, context?: HttpContext): Observable<Array<Project>> {
    return this.projectsListForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Project>>): Array<Project> => r.body)
    );
  }

  /** Path part for operation `projectsCreateForOrg()` */
  static readonly ProjectsCreateForOrgPath = '/orgs/{org}/projects';

  /**
   * Create an organization project.
   *
   * Creates an organization project board. Returns a `410 Gone` status if projects are disabled in the organization or if the organization does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsCreateForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForOrg$Response(params: ProjectsCreateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
    return projectsCreateForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an organization project.
   *
   * Creates an organization project board. Returns a `410 Gone` status if projects are disabled in the organization or if the organization does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsCreateForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForOrg(params: ProjectsCreateForOrg$Params, context?: HttpContext): Observable<Project> {
    return this.projectsCreateForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Project>): Project => r.body)
    );
  }

  /** Path part for operation `projectsGetCard()` */
  static readonly ProjectsGetCardPath = '/projects/columns/cards/{card_id}';

  /**
   * Get a project card.
   *
   * Gets information about a project card.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsGetCard()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetCard$Response(params: ProjectsGetCard$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCard>> {
    return projectsGetCard(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a project card.
   *
   * Gets information about a project card.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsGetCard$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetCard(params: ProjectsGetCard$Params, context?: HttpContext): Observable<ProjectCard> {
    return this.projectsGetCard$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectCard>): ProjectCard => r.body)
    );
  }

  /** Path part for operation `projectsDeleteCard()` */
  static readonly ProjectsDeleteCardPath = '/projects/columns/cards/{card_id}';

  /**
   * Delete a project card.
   *
   * Deletes a project card
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsDeleteCard()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDeleteCard$Response(params: ProjectsDeleteCard$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return projectsDeleteCard(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a project card.
   *
   * Deletes a project card
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsDeleteCard$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDeleteCard(params: ProjectsDeleteCard$Params, context?: HttpContext): Observable<void> {
    return this.projectsDeleteCard$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `projectsUpdateCard()` */
  static readonly ProjectsUpdateCardPath = '/projects/columns/cards/{card_id}';

  /**
   * Update an existing project card.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsUpdateCard()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdateCard$Response(params: ProjectsUpdateCard$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCard>> {
    return projectsUpdateCard(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an existing project card.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsUpdateCard$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdateCard(params: ProjectsUpdateCard$Params, context?: HttpContext): Observable<ProjectCard> {
    return this.projectsUpdateCard$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectCard>): ProjectCard => r.body)
    );
  }

  /** Path part for operation `projectsMoveCard()` */
  static readonly ProjectsMoveCardPath = '/projects/columns/cards/{card_id}/moves';

  /**
   * Move a project card.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsMoveCard()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsMoveCard$Response(params: ProjectsMoveCard$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return projectsMoveCard(this.http, this.rootUrl, params, context);
  }

  /**
   * Move a project card.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsMoveCard$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsMoveCard(params: ProjectsMoveCard$Params, context?: HttpContext): Observable<{
}> {
    return this.projectsMoveCard$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `projectsGetColumn()` */
  static readonly ProjectsGetColumnPath = '/projects/columns/{column_id}';

  /**
   * Get a project column.
   *
   * Gets information about a project column.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsGetColumn()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetColumn$Response(params: ProjectsGetColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
    return projectsGetColumn(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a project column.
   *
   * Gets information about a project column.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsGetColumn$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetColumn(params: ProjectsGetColumn$Params, context?: HttpContext): Observable<ProjectColumn> {
    return this.projectsGetColumn$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectColumn>): ProjectColumn => r.body)
    );
  }

  /** Path part for operation `projectsDeleteColumn()` */
  static readonly ProjectsDeleteColumnPath = '/projects/columns/{column_id}';

  /**
   * Delete a project column.
   *
   * Deletes a project column.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsDeleteColumn()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDeleteColumn$Response(params: ProjectsDeleteColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return projectsDeleteColumn(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a project column.
   *
   * Deletes a project column.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsDeleteColumn$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDeleteColumn(params: ProjectsDeleteColumn$Params, context?: HttpContext): Observable<void> {
    return this.projectsDeleteColumn$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `projectsUpdateColumn()` */
  static readonly ProjectsUpdateColumnPath = '/projects/columns/{column_id}';

  /**
   * Update an existing project column.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsUpdateColumn()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdateColumn$Response(params: ProjectsUpdateColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
    return projectsUpdateColumn(this.http, this.rootUrl, params, context);
  }

  /**
   * Update an existing project column.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsUpdateColumn$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdateColumn(params: ProjectsUpdateColumn$Params, context?: HttpContext): Observable<ProjectColumn> {
    return this.projectsUpdateColumn$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectColumn>): ProjectColumn => r.body)
    );
  }

  /** Path part for operation `projectsListCards()` */
  static readonly ProjectsListCardsPath = '/projects/columns/{column_id}/cards';

  /**
   * List project cards.
   *
   * Lists the project cards in a project.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListCards()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListCards$Response(params: ProjectsListCards$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ProjectCard>>> {
    return projectsListCards(this.http, this.rootUrl, params, context);
  }

  /**
   * List project cards.
   *
   * Lists the project cards in a project.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListCards$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListCards(params: ProjectsListCards$Params, context?: HttpContext): Observable<Array<ProjectCard>> {
    return this.projectsListCards$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ProjectCard>>): Array<ProjectCard> => r.body)
    );
  }

  /** Path part for operation `projectsCreateCard()` */
  static readonly ProjectsCreateCardPath = '/projects/columns/{column_id}/cards';

  /**
   * Create a project card.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsCreateCard()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateCard$Response(params: ProjectsCreateCard$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCard>> {
    return projectsCreateCard(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a project card.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsCreateCard$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateCard(params: ProjectsCreateCard$Params, context?: HttpContext): Observable<ProjectCard> {
    return this.projectsCreateCard$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectCard>): ProjectCard => r.body)
    );
  }

  /** Path part for operation `projectsMoveColumn()` */
  static readonly ProjectsMoveColumnPath = '/projects/columns/{column_id}/moves';

  /**
   * Move a project column.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsMoveColumn()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsMoveColumn$Response(params: ProjectsMoveColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return projectsMoveColumn(this.http, this.rootUrl, params, context);
  }

  /**
   * Move a project column.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsMoveColumn$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsMoveColumn(params: ProjectsMoveColumn$Params, context?: HttpContext): Observable<{
}> {
    return this.projectsMoveColumn$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `projectsGet()` */
  static readonly ProjectsGetPath = '/projects/{project_id}';

  /**
   * Get a project.
   *
   * Gets a project by its `id`. Returns a `404 Not Found` status if projects are disabled. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGet$Response(params: ProjectsGet$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
    return projectsGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a project.
   *
   * Gets a project by its `id`. Returns a `404 Not Found` status if projects are disabled. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGet(params: ProjectsGet$Params, context?: HttpContext): Observable<Project> {
    return this.projectsGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<Project>): Project => r.body)
    );
  }

  /** Path part for operation `projectsDelete()` */
  static readonly ProjectsDeletePath = '/projects/{project_id}';

  /**
   * Delete a project.
   *
   * Deletes a project board. Returns a `404 Not Found` status if projects are disabled.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsDelete()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDelete$Response(params: ProjectsDelete$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return projectsDelete(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a project.
   *
   * Deletes a project board. Returns a `404 Not Found` status if projects are disabled.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsDelete$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsDelete(params: ProjectsDelete$Params, context?: HttpContext): Observable<void> {
    return this.projectsDelete$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `projectsUpdate()` */
  static readonly ProjectsUpdatePath = '/projects/{project_id}';

  /**
   * Update a project.
   *
   * Updates a project board's information. Returns a `404 Not Found` status if projects are disabled. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdate$Response(params: ProjectsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
    return projectsUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a project.
   *
   * Updates a project board's information. Returns a `404 Not Found` status if projects are disabled. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsUpdate(params: ProjectsUpdate$Params, context?: HttpContext): Observable<Project> {
    return this.projectsUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<Project>): Project => r.body)
    );
  }

  /** Path part for operation `projectsListCollaborators()` */
  static readonly ProjectsListCollaboratorsPath = '/projects/{project_id}/collaborators';

  /**
   * List project collaborators.
   *
   * Lists the collaborators for an organization project. For a project, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners. You must be an organization owner or a project `admin` to list collaborators.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListCollaborators()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListCollaborators$Response(params: ProjectsListCollaborators$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
    return projectsListCollaborators(this.http, this.rootUrl, params, context);
  }

  /**
   * List project collaborators.
   *
   * Lists the collaborators for an organization project. For a project, the list of collaborators includes outside collaborators, organization members that are direct collaborators, organization members with access through team memberships, organization members with access through default organization permissions, and organization owners. You must be an organization owner or a project `admin` to list collaborators.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListCollaborators$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListCollaborators(params: ProjectsListCollaborators$Params, context?: HttpContext): Observable<Array<SimpleUser>> {
    return this.projectsListCollaborators$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleUser>>): Array<SimpleUser> => r.body)
    );
  }

  /** Path part for operation `projectsAddCollaborator()` */
  static readonly ProjectsAddCollaboratorPath = '/projects/{project_id}/collaborators/{username}';

  /**
   * Add project collaborator.
   *
   * Adds a collaborator to an organization project and sets their permission level. You must be an organization owner or a project `admin` to add a collaborator.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsAddCollaborator()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsAddCollaborator$Response(params: ProjectsAddCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return projectsAddCollaborator(this.http, this.rootUrl, params, context);
  }

  /**
   * Add project collaborator.
   *
   * Adds a collaborator to an organization project and sets their permission level. You must be an organization owner or a project `admin` to add a collaborator.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsAddCollaborator$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsAddCollaborator(params: ProjectsAddCollaborator$Params, context?: HttpContext): Observable<void> {
    return this.projectsAddCollaborator$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `projectsRemoveCollaborator()` */
  static readonly ProjectsRemoveCollaboratorPath = '/projects/{project_id}/collaborators/{username}';

  /**
   * Remove user as a collaborator.
   *
   * Removes a collaborator from an organization project. You must be an organization owner or a project `admin` to remove a collaborator.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsRemoveCollaborator()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsRemoveCollaborator$Response(params: ProjectsRemoveCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return projectsRemoveCollaborator(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove user as a collaborator.
   *
   * Removes a collaborator from an organization project. You must be an organization owner or a project `admin` to remove a collaborator.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsRemoveCollaborator$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsRemoveCollaborator(params: ProjectsRemoveCollaborator$Params, context?: HttpContext): Observable<void> {
    return this.projectsRemoveCollaborator$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `projectsGetPermissionForUser()` */
  static readonly ProjectsGetPermissionForUserPath = '/projects/{project_id}/collaborators/{username}/permission';

  /**
   * Get project permission for a user.
   *
   * Returns the collaborator's permission level for an organization project. Possible values for the `permission` key: `admin`, `write`, `read`, `none`. You must be an organization owner or a project `admin` to review a user's permission level.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsGetPermissionForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetPermissionForUser$Response(params: ProjectsGetPermissionForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCollaboratorPermission>> {
    return projectsGetPermissionForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get project permission for a user.
   *
   * Returns the collaborator's permission level for an organization project. Possible values for the `permission` key: `admin`, `write`, `read`, `none`. You must be an organization owner or a project `admin` to review a user's permission level.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsGetPermissionForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsGetPermissionForUser(params: ProjectsGetPermissionForUser$Params, context?: HttpContext): Observable<ProjectCollaboratorPermission> {
    return this.projectsGetPermissionForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectCollaboratorPermission>): ProjectCollaboratorPermission => r.body)
    );
  }

  /** Path part for operation `projectsListColumns()` */
  static readonly ProjectsListColumnsPath = '/projects/{project_id}/columns';

  /**
   * List project columns.
   *
   * Lists the project columns in a project.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListColumns()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListColumns$Response(params: ProjectsListColumns$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ProjectColumn>>> {
    return projectsListColumns(this.http, this.rootUrl, params, context);
  }

  /**
   * List project columns.
   *
   * Lists the project columns in a project.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListColumns$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListColumns(params: ProjectsListColumns$Params, context?: HttpContext): Observable<Array<ProjectColumn>> {
    return this.projectsListColumns$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ProjectColumn>>): Array<ProjectColumn> => r.body)
    );
  }

  /** Path part for operation `projectsCreateColumn()` */
  static readonly ProjectsCreateColumnPath = '/projects/{project_id}/columns';

  /**
   * Create a project column.
   *
   * Creates a new project column.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsCreateColumn()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateColumn$Response(params: ProjectsCreateColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
    return projectsCreateColumn(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a project column.
   *
   * Creates a new project column.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsCreateColumn$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateColumn(params: ProjectsCreateColumn$Params, context?: HttpContext): Observable<ProjectColumn> {
    return this.projectsCreateColumn$Response(params, context).pipe(
      map((r: StrictHttpResponse<ProjectColumn>): ProjectColumn => r.body)
    );
  }

  /** Path part for operation `projectsListForRepo()` */
  static readonly ProjectsListForRepoPath = '/repos/{owner}/{repo}/projects';

  /**
   * List repository projects.
   *
   * Lists the projects in a repository. Returns a `404 Not Found` status if projects are disabled in the repository. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForRepo$Response(params: ProjectsListForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Project>>> {
    return projectsListForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository projects.
   *
   * Lists the projects in a repository. Returns a `404 Not Found` status if projects are disabled in the repository. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForRepo(params: ProjectsListForRepo$Params, context?: HttpContext): Observable<Array<Project>> {
    return this.projectsListForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Project>>): Array<Project> => r.body)
    );
  }

  /** Path part for operation `projectsCreateForRepo()` */
  static readonly ProjectsCreateForRepoPath = '/repos/{owner}/{repo}/projects';

  /**
   * Create a repository project.
   *
   * Creates a repository project board. Returns a `410 Gone` status if projects are disabled in the repository or if the repository does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsCreateForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForRepo$Response(params: ProjectsCreateForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
    return projectsCreateForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository project.
   *
   * Creates a repository project board. Returns a `410 Gone` status if projects are disabled in the repository or if the repository does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsCreateForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForRepo(params: ProjectsCreateForRepo$Params, context?: HttpContext): Observable<Project> {
    return this.projectsCreateForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Project>): Project => r.body)
    );
  }

  /** Path part for operation `projectsCreateForAuthenticatedUser()` */
  static readonly ProjectsCreateForAuthenticatedUserPath = '/user/projects';

  /**
   * Create a user project.
   *
   * Creates a user project board. Returns a `410 Gone` status if the user does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsCreateForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForAuthenticatedUser$Response(params: ProjectsCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
    return projectsCreateForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a user project.
   *
   * Creates a user project board. Returns a `410 Gone` status if the user does not have existing classic projects. If you do not have sufficient privileges to perform this action, a `401 Unauthorized` or `410 Gone` status is returned.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsCreateForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  projectsCreateForAuthenticatedUser(params: ProjectsCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<Project> {
    return this.projectsCreateForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Project>): Project => r.body)
    );
  }

  /** Path part for operation `projectsListForUser()` */
  static readonly ProjectsListForUserPath = '/users/{username}/projects';

  /**
   * List user projects.
   *
   * Lists projects for a user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `projectsListForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForUser$Response(params: ProjectsListForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Project>>> {
    return projectsListForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List user projects.
   *
   * Lists projects for a user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `projectsListForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  projectsListForUser(params: ProjectsListForUser$Params, context?: HttpContext): Observable<Array<Project>> {
    return this.projectsListForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Project>>): Array<Project> => r.body)
    );
  }

}
