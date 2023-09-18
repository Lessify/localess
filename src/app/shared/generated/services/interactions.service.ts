/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { InteractionLimitResponse } from '../models/interaction-limit-response';
import { interactionsGetRestrictionsForAuthenticatedUser } from '../fn/interactions/interactions-get-restrictions-for-authenticated-user';
import { InteractionsGetRestrictionsForAuthenticatedUser$Params } from '../fn/interactions/interactions-get-restrictions-for-authenticated-user';
import { interactionsGetRestrictionsForOrg } from '../fn/interactions/interactions-get-restrictions-for-org';
import { InteractionsGetRestrictionsForOrg$Params } from '../fn/interactions/interactions-get-restrictions-for-org';
import { interactionsGetRestrictionsForRepo } from '../fn/interactions/interactions-get-restrictions-for-repo';
import { InteractionsGetRestrictionsForRepo$Params } from '../fn/interactions/interactions-get-restrictions-for-repo';
import { interactionsRemoveRestrictionsForAuthenticatedUser } from '../fn/interactions/interactions-remove-restrictions-for-authenticated-user';
import { InteractionsRemoveRestrictionsForAuthenticatedUser$Params } from '../fn/interactions/interactions-remove-restrictions-for-authenticated-user';
import { interactionsRemoveRestrictionsForOrg } from '../fn/interactions/interactions-remove-restrictions-for-org';
import { InteractionsRemoveRestrictionsForOrg$Params } from '../fn/interactions/interactions-remove-restrictions-for-org';
import { interactionsRemoveRestrictionsForRepo } from '../fn/interactions/interactions-remove-restrictions-for-repo';
import { InteractionsRemoveRestrictionsForRepo$Params } from '../fn/interactions/interactions-remove-restrictions-for-repo';
import { interactionsSetRestrictionsForAuthenticatedUser } from '../fn/interactions/interactions-set-restrictions-for-authenticated-user';
import { InteractionsSetRestrictionsForAuthenticatedUser$Params } from '../fn/interactions/interactions-set-restrictions-for-authenticated-user';
import { interactionsSetRestrictionsForOrg } from '../fn/interactions/interactions-set-restrictions-for-org';
import { InteractionsSetRestrictionsForOrg$Params } from '../fn/interactions/interactions-set-restrictions-for-org';
import { interactionsSetRestrictionsForRepo } from '../fn/interactions/interactions-set-restrictions-for-repo';
import { InteractionsSetRestrictionsForRepo$Params } from '../fn/interactions/interactions-set-restrictions-for-repo';


/**
 * Owner or admin management of users interactions.
 */
@Injectable({ providedIn: 'root' })
export class InteractionsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `interactionsGetRestrictionsForOrg()` */
  static readonly InteractionsGetRestrictionsForOrgPath = '/orgs/{org}/interaction-limits';

  /**
   * Get interaction restrictions for an organization.
   *
   * Shows which type of GitHub user can interact with this organization and when the restriction expires. If there is no restrictions, you will see an empty response.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsGetRestrictionsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForOrg$Response(params: InteractionsGetRestrictionsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<(InteractionLimitResponse | {
})>> {
    return interactionsGetRestrictionsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get interaction restrictions for an organization.
   *
   * Shows which type of GitHub user can interact with this organization and when the restriction expires. If there is no restrictions, you will see an empty response.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsGetRestrictionsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForOrg(params: InteractionsGetRestrictionsForOrg$Params, context?: HttpContext): Observable<(InteractionLimitResponse | {
})> {
    return this.interactionsGetRestrictionsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<(InteractionLimitResponse | {
})>): (InteractionLimitResponse | {
}) => r.body)
    );
  }

  /** Path part for operation `interactionsSetRestrictionsForOrg()` */
  static readonly InteractionsSetRestrictionsForOrgPath = '/orgs/{org}/interaction-limits';

  /**
   * Set interaction restrictions for an organization.
   *
   * Temporarily restricts interactions to a certain type of GitHub user in any public repository in the given organization. You must be an organization owner to set these restrictions. Setting the interaction limit at the organization level will overwrite any interaction limits that are set for individual repositories owned by the organization.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsSetRestrictionsForOrg()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForOrg$Response(params: InteractionsSetRestrictionsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<InteractionLimitResponse>> {
    return interactionsSetRestrictionsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Set interaction restrictions for an organization.
   *
   * Temporarily restricts interactions to a certain type of GitHub user in any public repository in the given organization. You must be an organization owner to set these restrictions. Setting the interaction limit at the organization level will overwrite any interaction limits that are set for individual repositories owned by the organization.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsSetRestrictionsForOrg$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForOrg(params: InteractionsSetRestrictionsForOrg$Params, context?: HttpContext): Observable<InteractionLimitResponse> {
    return this.interactionsSetRestrictionsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<InteractionLimitResponse>): InteractionLimitResponse => r.body)
    );
  }

  /** Path part for operation `interactionsRemoveRestrictionsForOrg()` */
  static readonly InteractionsRemoveRestrictionsForOrgPath = '/orgs/{org}/interaction-limits';

  /**
   * Remove interaction restrictions for an organization.
   *
   * Removes all interaction restrictions from public repositories in the given organization. You must be an organization owner to remove restrictions.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsRemoveRestrictionsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForOrg$Response(params: InteractionsRemoveRestrictionsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return interactionsRemoveRestrictionsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove interaction restrictions for an organization.
   *
   * Removes all interaction restrictions from public repositories in the given organization. You must be an organization owner to remove restrictions.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsRemoveRestrictionsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForOrg(params: InteractionsRemoveRestrictionsForOrg$Params, context?: HttpContext): Observable<void> {
    return this.interactionsRemoveRestrictionsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `interactionsGetRestrictionsForRepo()` */
  static readonly InteractionsGetRestrictionsForRepoPath = '/repos/{owner}/{repo}/interaction-limits';

  /**
   * Get interaction restrictions for a repository.
   *
   * Shows which type of GitHub user can interact with this repository and when the restriction expires. If there are no restrictions, you will see an empty response.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsGetRestrictionsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForRepo$Response(params: InteractionsGetRestrictionsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<(InteractionLimitResponse | {
})>> {
    return interactionsGetRestrictionsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Get interaction restrictions for a repository.
   *
   * Shows which type of GitHub user can interact with this repository and when the restriction expires. If there are no restrictions, you will see an empty response.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsGetRestrictionsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForRepo(params: InteractionsGetRestrictionsForRepo$Params, context?: HttpContext): Observable<(InteractionLimitResponse | {
})> {
    return this.interactionsGetRestrictionsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<(InteractionLimitResponse | {
})>): (InteractionLimitResponse | {
}) => r.body)
    );
  }

  /** Path part for operation `interactionsSetRestrictionsForRepo()` */
  static readonly InteractionsSetRestrictionsForRepoPath = '/repos/{owner}/{repo}/interaction-limits';

  /**
   * Set interaction restrictions for a repository.
   *
   * Temporarily restricts interactions to a certain type of GitHub user within the given repository. You must have owner or admin access to set these restrictions. If an interaction limit is set for the user or organization that owns this repository, you will receive a `409 Conflict` response and will not be able to use this endpoint to change the interaction limit for a single repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsSetRestrictionsForRepo()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForRepo$Response(params: InteractionsSetRestrictionsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<InteractionLimitResponse>> {
    return interactionsSetRestrictionsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Set interaction restrictions for a repository.
   *
   * Temporarily restricts interactions to a certain type of GitHub user within the given repository. You must have owner or admin access to set these restrictions. If an interaction limit is set for the user or organization that owns this repository, you will receive a `409 Conflict` response and will not be able to use this endpoint to change the interaction limit for a single repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsSetRestrictionsForRepo$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForRepo(params: InteractionsSetRestrictionsForRepo$Params, context?: HttpContext): Observable<InteractionLimitResponse> {
    return this.interactionsSetRestrictionsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<InteractionLimitResponse>): InteractionLimitResponse => r.body)
    );
  }

  /** Path part for operation `interactionsRemoveRestrictionsForRepo()` */
  static readonly InteractionsRemoveRestrictionsForRepoPath = '/repos/{owner}/{repo}/interaction-limits';

  /**
   * Remove interaction restrictions for a repository.
   *
   * Removes all interaction restrictions from the given repository. You must have owner or admin access to remove restrictions. If the interaction limit is set for the user or organization that owns this repository, you will receive a `409 Conflict` response and will not be able to use this endpoint to change the interaction limit for a single repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsRemoveRestrictionsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForRepo$Response(params: InteractionsRemoveRestrictionsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return interactionsRemoveRestrictionsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove interaction restrictions for a repository.
   *
   * Removes all interaction restrictions from the given repository. You must have owner or admin access to remove restrictions. If the interaction limit is set for the user or organization that owns this repository, you will receive a `409 Conflict` response and will not be able to use this endpoint to change the interaction limit for a single repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsRemoveRestrictionsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForRepo(params: InteractionsRemoveRestrictionsForRepo$Params, context?: HttpContext): Observable<void> {
    return this.interactionsRemoveRestrictionsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `interactionsGetRestrictionsForAuthenticatedUser()` */
  static readonly InteractionsGetRestrictionsForAuthenticatedUserPath = '/user/interaction-limits';

  /**
   * Get interaction restrictions for your public repositories.
   *
   * Shows which type of GitHub user can interact with your public repositories and when the restriction expires.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsGetRestrictionsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForAuthenticatedUser$Response(params?: InteractionsGetRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<(InteractionLimitResponse | {
})>> {
    return interactionsGetRestrictionsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get interaction restrictions for your public repositories.
   *
   * Shows which type of GitHub user can interact with your public repositories and when the restriction expires.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsGetRestrictionsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsGetRestrictionsForAuthenticatedUser(params?: InteractionsGetRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<(InteractionLimitResponse | {
})> {
    return this.interactionsGetRestrictionsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<(InteractionLimitResponse | {
})>): (InteractionLimitResponse | {
}) => r.body)
    );
  }

  /** Path part for operation `interactionsSetRestrictionsForAuthenticatedUser()` */
  static readonly InteractionsSetRestrictionsForAuthenticatedUserPath = '/user/interaction-limits';

  /**
   * Set interaction restrictions for your public repositories.
   *
   * Temporarily restricts which type of GitHub user can interact with your public repositories. Setting the interaction limit at the user level will overwrite any interaction limits that are set for individual repositories owned by the user.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsSetRestrictionsForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForAuthenticatedUser$Response(params: InteractionsSetRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<InteractionLimitResponse>> {
    return interactionsSetRestrictionsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Set interaction restrictions for your public repositories.
   *
   * Temporarily restricts which type of GitHub user can interact with your public repositories. Setting the interaction limit at the user level will overwrite any interaction limits that are set for individual repositories owned by the user.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsSetRestrictionsForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  interactionsSetRestrictionsForAuthenticatedUser(params: InteractionsSetRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<InteractionLimitResponse> {
    return this.interactionsSetRestrictionsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<InteractionLimitResponse>): InteractionLimitResponse => r.body)
    );
  }

  /** Path part for operation `interactionsRemoveRestrictionsForAuthenticatedUser()` */
  static readonly InteractionsRemoveRestrictionsForAuthenticatedUserPath = '/user/interaction-limits';

  /**
   * Remove interaction restrictions from your public repositories.
   *
   * Removes any interaction restrictions from your public repositories.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `interactionsRemoveRestrictionsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForAuthenticatedUser$Response(params?: InteractionsRemoveRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return interactionsRemoveRestrictionsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove interaction restrictions from your public repositories.
   *
   * Removes any interaction restrictions from your public repositories.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `interactionsRemoveRestrictionsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  interactionsRemoveRestrictionsForAuthenticatedUser(params?: InteractionsRemoveRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.interactionsRemoveRestrictionsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

}
