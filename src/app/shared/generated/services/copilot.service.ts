/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CopilotOrganizationDetails } from '../models/copilot-organization-details';
import { CopilotSeatDetails } from '../models/copilot-seat-details';
import { copilotAddCopilotForBusinessSeatsForTeams } from '../fn/copilot/copilot-add-copilot-for-business-seats-for-teams';
import { CopilotAddCopilotForBusinessSeatsForTeams$Params } from '../fn/copilot/copilot-add-copilot-for-business-seats-for-teams';
import { copilotAddCopilotForBusinessSeatsForUsers } from '../fn/copilot/copilot-add-copilot-for-business-seats-for-users';
import { CopilotAddCopilotForBusinessSeatsForUsers$Params } from '../fn/copilot/copilot-add-copilot-for-business-seats-for-users';
import { copilotCancelCopilotSeatAssignmentForTeams } from '../fn/copilot/copilot-cancel-copilot-seat-assignment-for-teams';
import { CopilotCancelCopilotSeatAssignmentForTeams$Params } from '../fn/copilot/copilot-cancel-copilot-seat-assignment-for-teams';
import { copilotCancelCopilotSeatAssignmentForUsers } from '../fn/copilot/copilot-cancel-copilot-seat-assignment-for-users';
import { CopilotCancelCopilotSeatAssignmentForUsers$Params } from '../fn/copilot/copilot-cancel-copilot-seat-assignment-for-users';
import { copilotGetCopilotOrganizationDetails } from '../fn/copilot/copilot-get-copilot-organization-details';
import { CopilotGetCopilotOrganizationDetails$Params } from '../fn/copilot/copilot-get-copilot-organization-details';
import { copilotGetCopilotSeatAssignmentDetailsForUser } from '../fn/copilot/copilot-get-copilot-seat-assignment-details-for-user';
import { CopilotGetCopilotSeatAssignmentDetailsForUser$Params } from '../fn/copilot/copilot-get-copilot-seat-assignment-details-for-user';
import { copilotListCopilotSeats } from '../fn/copilot/copilot-list-copilot-seats';
import { CopilotListCopilotSeats$Params } from '../fn/copilot/copilot-list-copilot-seats';


/**
 * Endpoints to manage Copilot using the REST API.
 */
@Injectable({ providedIn: 'root' })
export class CopilotService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `copilotGetCopilotOrganizationDetails()` */
  static readonly CopilotGetCopilotOrganizationDetailsPath = '/orgs/{org}/copilot/billing';

  /**
   * Get Copilot for Business seat information and settings for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Gets information about an organization's Copilot for Business subscription, including seat breakdown
   * and code matching policies. To configure these settings, go to your organization's settings on GitHub.com.
   * For more information, see "[Configuring GitHub Copilot settings in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure and view details about the organization's Copilot for Business subscription. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotGetCopilotOrganizationDetails()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotGetCopilotOrganizationDetails$Response(params: CopilotGetCopilotOrganizationDetails$Params, context?: HttpContext): Observable<StrictHttpResponse<CopilotOrganizationDetails>> {
    return copilotGetCopilotOrganizationDetails(this.http, this.rootUrl, params, context);
  }

  /**
   * Get Copilot for Business seat information and settings for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Gets information about an organization's Copilot for Business subscription, including seat breakdown
   * and code matching policies. To configure these settings, go to your organization's settings on GitHub.com.
   * For more information, see "[Configuring GitHub Copilot settings in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure and view details about the organization's Copilot for Business subscription. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotGetCopilotOrganizationDetails$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotGetCopilotOrganizationDetails(params: CopilotGetCopilotOrganizationDetails$Params, context?: HttpContext): Observable<CopilotOrganizationDetails> {
    return this.copilotGetCopilotOrganizationDetails$Response(params, context).pipe(
      map((r: StrictHttpResponse<CopilotOrganizationDetails>): CopilotOrganizationDetails => r.body)
    );
  }

  /** Path part for operation `copilotListCopilotSeats()` */
  static readonly CopilotListCopilotSeatsPath = '/orgs/{org}/copilot/billing/seats';

  /**
   * List all Copilot for Business seat assignments for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Lists all Copilot for Business seat assignments for an organization that are currently being billed (either active or pending cancellation at the start of the next billing cycle).
   *
   * Only organization owners and members with admin permissions can configure and view details about the organization's Copilot for Business subscription. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotListCopilotSeats()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotListCopilotSeats$Response(params: CopilotListCopilotSeats$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * Total number of Copilot For Business seats for the organization currently being billed.
 */
'total_seats'?: number;
'seats'?: Array<CopilotSeatDetails>;
}>> {
    return copilotListCopilotSeats(this.http, this.rootUrl, params, context);
  }

  /**
   * List all Copilot for Business seat assignments for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Lists all Copilot for Business seat assignments for an organization that are currently being billed (either active or pending cancellation at the start of the next billing cycle).
   *
   * Only organization owners and members with admin permissions can configure and view details about the organization's Copilot for Business subscription. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotListCopilotSeats$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotListCopilotSeats(params: CopilotListCopilotSeats$Params, context?: HttpContext): Observable<{

/**
 * Total number of Copilot For Business seats for the organization currently being billed.
 */
'total_seats'?: number;
'seats'?: Array<CopilotSeatDetails>;
}> {
    return this.copilotListCopilotSeats$Response(params, context).pipe(
      map((r: StrictHttpResponse<{

/**
 * Total number of Copilot For Business seats for the organization currently being billed.
 */
'total_seats'?: number;
'seats'?: Array<CopilotSeatDetails>;
}>): {

/**
 * Total number of Copilot For Business seats for the organization currently being billed.
 */
'total_seats'?: number;
'seats'?: Array<CopilotSeatDetails>;
} => r.body)
    );
  }

  /** Path part for operation `copilotAddCopilotForBusinessSeatsForTeams()` */
  static readonly CopilotAddCopilotForBusinessSeatsForTeamsPath = '/orgs/{org}/copilot/billing/selected_teams';

  /**
   * Add teams to the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   *  Purchases a GitHub Copilot for Business seat for all users within each specified team.
   *  The organization will be billed accordingly. For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   *  Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   *  authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   *  In order for an admin to use this endpoint, the organization must have a Copilot for Business subscription and a configured suggestion matching policy.
   *  For more information about setting up a Copilot for Business subscription, see "[Setting up a Copilot for Business subscription for your organization](https://docs.github.com/billing/managing-billing-for-github-copilot/managing-your-github-copilot-subscription-for-your-organization-or-enterprise#setting-up-a-copilot-for-business-subscription-for-your-organization)".
   *  For more information about setting a suggestion matching policy, see "[Configuring suggestion matching policies for GitHub Copilot in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#configuring-suggestion-matching-policies-for-github-copilot-in-your-organization)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotAddCopilotForBusinessSeatsForTeams()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotAddCopilotForBusinessSeatsForTeams$Response(params: CopilotAddCopilotForBusinessSeatsForTeams$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_created': number;
}>> {
    return copilotAddCopilotForBusinessSeatsForTeams(this.http, this.rootUrl, params, context);
  }

  /**
   * Add teams to the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   *  Purchases a GitHub Copilot for Business seat for all users within each specified team.
   *  The organization will be billed accordingly. For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   *  Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   *  authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   *  In order for an admin to use this endpoint, the organization must have a Copilot for Business subscription and a configured suggestion matching policy.
   *  For more information about setting up a Copilot for Business subscription, see "[Setting up a Copilot for Business subscription for your organization](https://docs.github.com/billing/managing-billing-for-github-copilot/managing-your-github-copilot-subscription-for-your-organization-or-enterprise#setting-up-a-copilot-for-business-subscription-for-your-organization)".
   *  For more information about setting a suggestion matching policy, see "[Configuring suggestion matching policies for GitHub Copilot in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#configuring-suggestion-matching-policies-for-github-copilot-in-your-organization)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotAddCopilotForBusinessSeatsForTeams$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotAddCopilotForBusinessSeatsForTeams(params: CopilotAddCopilotForBusinessSeatsForTeams$Params, context?: HttpContext): Observable<{
'seats_created': number;
}> {
    return this.copilotAddCopilotForBusinessSeatsForTeams$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'seats_created': number;
}>): {
'seats_created': number;
} => r.body)
    );
  }

  /** Path part for operation `copilotCancelCopilotSeatAssignmentForTeams()` */
  static readonly CopilotCancelCopilotSeatAssignmentForTeamsPath = '/orgs/{org}/copilot/billing/selected_teams';

  /**
   * Remove teams from the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Cancels the Copilot for Business seat assignment for all members of each team specified.
   * This will cause the members of the specified team(s) to lose access to GitHub Copilot at the end of the current billing cycle, and the organization will not be billed further for those users.
   *
   * For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   * For more information about disabling access to Copilot for Business, see "[Disabling access to GitHub Copilot for specific users in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#disabling-access-to-github-copilot-for-specific-users-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotCancelCopilotSeatAssignmentForTeams()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotCancelCopilotSeatAssignmentForTeams$Response(params: CopilotCancelCopilotSeatAssignmentForTeams$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_cancelled': number;
}>> {
    return copilotCancelCopilotSeatAssignmentForTeams(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove teams from the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Cancels the Copilot for Business seat assignment for all members of each team specified.
   * This will cause the members of the specified team(s) to lose access to GitHub Copilot at the end of the current billing cycle, and the organization will not be billed further for those users.
   *
   * For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   * For more information about disabling access to Copilot for Business, see "[Disabling access to GitHub Copilot for specific users in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#disabling-access-to-github-copilot-for-specific-users-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotCancelCopilotSeatAssignmentForTeams$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotCancelCopilotSeatAssignmentForTeams(params: CopilotCancelCopilotSeatAssignmentForTeams$Params, context?: HttpContext): Observable<{
'seats_cancelled': number;
}> {
    return this.copilotCancelCopilotSeatAssignmentForTeams$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'seats_cancelled': number;
}>): {
'seats_cancelled': number;
} => r.body)
    );
  }

  /** Path part for operation `copilotAddCopilotForBusinessSeatsForUsers()` */
  static readonly CopilotAddCopilotForBusinessSeatsForUsersPath = '/orgs/{org}/copilot/billing/selected_users';

  /**
   * Add users to the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Purchases a GitHub Copilot for Business seat for each user specified.
   * The organization will be billed accordingly. For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * In order for an admin to use this endpoint, the organization must have a Copilot for Business subscription and a configured suggestion matching policy.
   * For more information about setting up a Copilot for Business subscription, see "[Setting up a Copilot for Business subscription for your organization](https://docs.github.com/billing/managing-billing-for-github-copilot/managing-your-github-copilot-subscription-for-your-organization-or-enterprise#setting-up-a-copilot-for-business-subscription-for-your-organization)".
   * For more information about setting a suggestion matching policy, see "[Configuring suggestion matching policies for GitHub Copilot in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#configuring-suggestion-matching-policies-for-github-copilot-in-your-organization)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotAddCopilotForBusinessSeatsForUsers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotAddCopilotForBusinessSeatsForUsers$Response(params: CopilotAddCopilotForBusinessSeatsForUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_created': number;
}>> {
    return copilotAddCopilotForBusinessSeatsForUsers(this.http, this.rootUrl, params, context);
  }

  /**
   * Add users to the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Purchases a GitHub Copilot for Business seat for each user specified.
   * The organization will be billed accordingly. For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * In order for an admin to use this endpoint, the organization must have a Copilot for Business subscription and a configured suggestion matching policy.
   * For more information about setting up a Copilot for Business subscription, see "[Setting up a Copilot for Business subscription for your organization](https://docs.github.com/billing/managing-billing-for-github-copilot/managing-your-github-copilot-subscription-for-your-organization-or-enterprise#setting-up-a-copilot-for-business-subscription-for-your-organization)".
   * For more information about setting a suggestion matching policy, see "[Configuring suggestion matching policies for GitHub Copilot in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#configuring-suggestion-matching-policies-for-github-copilot-in-your-organization)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotAddCopilotForBusinessSeatsForUsers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotAddCopilotForBusinessSeatsForUsers(params: CopilotAddCopilotForBusinessSeatsForUsers$Params, context?: HttpContext): Observable<{
'seats_created': number;
}> {
    return this.copilotAddCopilotForBusinessSeatsForUsers$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'seats_created': number;
}>): {
'seats_created': number;
} => r.body)
    );
  }

  /** Path part for operation `copilotCancelCopilotSeatAssignmentForUsers()` */
  static readonly CopilotCancelCopilotSeatAssignmentForUsersPath = '/orgs/{org}/copilot/billing/selected_users';

  /**
   * Remove users from the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Cancels the Copilot for Business seat assignment for each user specified.
   * This will cause the specified users to lose access to GitHub Copilot at the end of the current billing cycle, and the organization will not be billed further for those users.
   *
   * For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)"
   *
   * For more information about disabling access to Copilot for Business, see "[Disabling access to GitHub Copilot for specific users in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#disabling-access-to-github-copilot-for-specific-users-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotCancelCopilotSeatAssignmentForUsers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotCancelCopilotSeatAssignmentForUsers$Response(params: CopilotCancelCopilotSeatAssignmentForUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'seats_cancelled': number;
}>> {
    return copilotCancelCopilotSeatAssignmentForUsers(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove users from the Copilot for Business subscription for an organization.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Cancels the Copilot for Business seat assignment for each user specified.
   * This will cause the specified users to lose access to GitHub Copilot at the end of the current billing cycle, and the organization will not be billed further for those users.
   *
   * For more information about Copilot for Business pricing, see "[About billing for GitHub Copilot for Business](https://docs.github.com/billing/managing-billing-for-github-copilot/about-billing-for-github-copilot#pricing-for-github-copilot-for-business)"
   *
   * For more information about disabling access to Copilot for Business, see "[Disabling access to GitHub Copilot for specific users in your organization](https://docs.github.com/copilot/configuring-github-copilot/configuring-github-copilot-settings-in-your-organization#disabling-access-to-github-copilot-for-specific-users-in-your-organization)".
   *
   * Only organization owners and members with admin permissions can configure GitHub Copilot in their organization. You must
   * authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotCancelCopilotSeatAssignmentForUsers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  copilotCancelCopilotSeatAssignmentForUsers(params: CopilotCancelCopilotSeatAssignmentForUsers$Params, context?: HttpContext): Observable<{
'seats_cancelled': number;
}> {
    return this.copilotCancelCopilotSeatAssignmentForUsers$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'seats_cancelled': number;
}>): {
'seats_cancelled': number;
} => r.body)
    );
  }

  /** Path part for operation `copilotGetCopilotSeatAssignmentDetailsForUser()` */
  static readonly CopilotGetCopilotSeatAssignmentDetailsForUserPath = '/orgs/{org}/members/{username}/copilot';

  /**
   * Get Copilot for Business seat assignment details for a user.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Gets the GitHub Copilot for Business seat assignment details for a member of an organization who currently has access to GitHub Copilot.
   *
   * Organization owners and members with admin permissions can view GitHub Copilot seat assignment details for members in their organization. You must authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `copilotGetCopilotSeatAssignmentDetailsForUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotGetCopilotSeatAssignmentDetailsForUser$Response(params: CopilotGetCopilotSeatAssignmentDetailsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CopilotSeatDetails>> {
    return copilotGetCopilotSeatAssignmentDetailsForUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get Copilot for Business seat assignment details for a user.
   *
   * **Note**: This endpoint is in beta and is subject to change.
   *
   * Gets the GitHub Copilot for Business seat assignment details for a member of an organization who currently has access to GitHub Copilot.
   *
   * Organization owners and members with admin permissions can view GitHub Copilot seat assignment details for members in their organization. You must authenticate using an access token with the `manage_billing:copilot` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `copilotGetCopilotSeatAssignmentDetailsForUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  copilotGetCopilotSeatAssignmentDetailsForUser(params: CopilotGetCopilotSeatAssignmentDetailsForUser$Params, context?: HttpContext): Observable<CopilotSeatDetails> {
    return this.copilotGetCopilotSeatAssignmentDetailsForUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CopilotSeatDetails>): CopilotSeatDetails => r.body)
    );
  }

}
