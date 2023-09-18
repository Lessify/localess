/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { appsAddRepoToInstallationForAuthenticatedUser } from '../fn/apps/apps-add-repo-to-installation-for-authenticated-user';
import { AppsAddRepoToInstallationForAuthenticatedUser$Params } from '../fn/apps/apps-add-repo-to-installation-for-authenticated-user';
import { appsCheckToken } from '../fn/apps/apps-check-token';
import { AppsCheckToken$Params } from '../fn/apps/apps-check-token';
import { appsCreateFromManifest } from '../fn/apps/apps-create-from-manifest';
import { AppsCreateFromManifest$Params } from '../fn/apps/apps-create-from-manifest';
import { appsCreateInstallationAccessToken } from '../fn/apps/apps-create-installation-access-token';
import { AppsCreateInstallationAccessToken$Params } from '../fn/apps/apps-create-installation-access-token';
import { appsDeleteAuthorization } from '../fn/apps/apps-delete-authorization';
import { AppsDeleteAuthorization$Params } from '../fn/apps/apps-delete-authorization';
import { appsDeleteInstallation } from '../fn/apps/apps-delete-installation';
import { AppsDeleteInstallation$Params } from '../fn/apps/apps-delete-installation';
import { appsDeleteToken } from '../fn/apps/apps-delete-token';
import { AppsDeleteToken$Params } from '../fn/apps/apps-delete-token';
import { appsGetAuthenticated } from '../fn/apps/apps-get-authenticated';
import { AppsGetAuthenticated$Params } from '../fn/apps/apps-get-authenticated';
import { appsGetBySlug } from '../fn/apps/apps-get-by-slug';
import { AppsGetBySlug$Params } from '../fn/apps/apps-get-by-slug';
import { appsGetInstallation } from '../fn/apps/apps-get-installation';
import { AppsGetInstallation$Params } from '../fn/apps/apps-get-installation';
import { appsGetOrgInstallation } from '../fn/apps/apps-get-org-installation';
import { AppsGetOrgInstallation$Params } from '../fn/apps/apps-get-org-installation';
import { appsGetRepoInstallation } from '../fn/apps/apps-get-repo-installation';
import { AppsGetRepoInstallation$Params } from '../fn/apps/apps-get-repo-installation';
import { appsGetSubscriptionPlanForAccount } from '../fn/apps/apps-get-subscription-plan-for-account';
import { AppsGetSubscriptionPlanForAccount$Params } from '../fn/apps/apps-get-subscription-plan-for-account';
import { appsGetSubscriptionPlanForAccountStubbed } from '../fn/apps/apps-get-subscription-plan-for-account-stubbed';
import { AppsGetSubscriptionPlanForAccountStubbed$Params } from '../fn/apps/apps-get-subscription-plan-for-account-stubbed';
import { appsGetUserInstallation } from '../fn/apps/apps-get-user-installation';
import { AppsGetUserInstallation$Params } from '../fn/apps/apps-get-user-installation';
import { appsGetWebhookConfigForApp } from '../fn/apps/apps-get-webhook-config-for-app';
import { AppsGetWebhookConfigForApp$Params } from '../fn/apps/apps-get-webhook-config-for-app';
import { appsGetWebhookDelivery } from '../fn/apps/apps-get-webhook-delivery';
import { AppsGetWebhookDelivery$Params } from '../fn/apps/apps-get-webhook-delivery';
import { appsListAccountsForPlan } from '../fn/apps/apps-list-accounts-for-plan';
import { AppsListAccountsForPlan$Params } from '../fn/apps/apps-list-accounts-for-plan';
import { appsListAccountsForPlanStubbed } from '../fn/apps/apps-list-accounts-for-plan-stubbed';
import { AppsListAccountsForPlanStubbed$Params } from '../fn/apps/apps-list-accounts-for-plan-stubbed';
import { appsListInstallationReposForAuthenticatedUser } from '../fn/apps/apps-list-installation-repos-for-authenticated-user';
import { AppsListInstallationReposForAuthenticatedUser$Params } from '../fn/apps/apps-list-installation-repos-for-authenticated-user';
import { appsListInstallationRequestsForAuthenticatedApp } from '../fn/apps/apps-list-installation-requests-for-authenticated-app';
import { AppsListInstallationRequestsForAuthenticatedApp$Params } from '../fn/apps/apps-list-installation-requests-for-authenticated-app';
import { appsListInstallations } from '../fn/apps/apps-list-installations';
import { AppsListInstallations$Params } from '../fn/apps/apps-list-installations';
import { appsListInstallationsForAuthenticatedUser } from '../fn/apps/apps-list-installations-for-authenticated-user';
import { AppsListInstallationsForAuthenticatedUser$Params } from '../fn/apps/apps-list-installations-for-authenticated-user';
import { appsListPlans } from '../fn/apps/apps-list-plans';
import { AppsListPlans$Params } from '../fn/apps/apps-list-plans';
import { appsListPlansStubbed } from '../fn/apps/apps-list-plans-stubbed';
import { AppsListPlansStubbed$Params } from '../fn/apps/apps-list-plans-stubbed';
import { appsListReposAccessibleToInstallation } from '../fn/apps/apps-list-repos-accessible-to-installation';
import { AppsListReposAccessibleToInstallation$Params } from '../fn/apps/apps-list-repos-accessible-to-installation';
import { appsListSubscriptionsForAuthenticatedUser } from '../fn/apps/apps-list-subscriptions-for-authenticated-user';
import { AppsListSubscriptionsForAuthenticatedUser$Params } from '../fn/apps/apps-list-subscriptions-for-authenticated-user';
import { appsListSubscriptionsForAuthenticatedUserStubbed } from '../fn/apps/apps-list-subscriptions-for-authenticated-user-stubbed';
import { AppsListSubscriptionsForAuthenticatedUserStubbed$Params } from '../fn/apps/apps-list-subscriptions-for-authenticated-user-stubbed';
import { appsListWebhookDeliveries } from '../fn/apps/apps-list-webhook-deliveries';
import { AppsListWebhookDeliveries$Params } from '../fn/apps/apps-list-webhook-deliveries';
import { appsRedeliverWebhookDelivery } from '../fn/apps/apps-redeliver-webhook-delivery';
import { AppsRedeliverWebhookDelivery$Params } from '../fn/apps/apps-redeliver-webhook-delivery';
import { appsRemoveRepoFromInstallationForAuthenticatedUser } from '../fn/apps/apps-remove-repo-from-installation-for-authenticated-user';
import { AppsRemoveRepoFromInstallationForAuthenticatedUser$Params } from '../fn/apps/apps-remove-repo-from-installation-for-authenticated-user';
import { appsResetToken } from '../fn/apps/apps-reset-token';
import { AppsResetToken$Params } from '../fn/apps/apps-reset-token';
import { appsRevokeInstallationAccessToken } from '../fn/apps/apps-revoke-installation-access-token';
import { AppsRevokeInstallationAccessToken$Params } from '../fn/apps/apps-revoke-installation-access-token';
import { appsScopeToken } from '../fn/apps/apps-scope-token';
import { AppsScopeToken$Params } from '../fn/apps/apps-scope-token';
import { appsSuspendInstallation } from '../fn/apps/apps-suspend-installation';
import { AppsSuspendInstallation$Params } from '../fn/apps/apps-suspend-installation';
import { appsUnsuspendInstallation } from '../fn/apps/apps-unsuspend-installation';
import { AppsUnsuspendInstallation$Params } from '../fn/apps/apps-unsuspend-installation';
import { appsUpdateWebhookConfigForApp } from '../fn/apps/apps-update-webhook-config-for-app';
import { AppsUpdateWebhookConfigForApp$Params } from '../fn/apps/apps-update-webhook-config-for-app';
import { Authorization } from '../models/authorization';
import { HookDelivery } from '../models/hook-delivery';
import { HookDeliveryItem } from '../models/hook-delivery-item';
import { Installation } from '../models/installation';
import { InstallationToken } from '../models/installation-token';
import { Integration } from '../models/integration';
import { IntegrationInstallationRequest } from '../models/integration-installation-request';
import { MarketplaceListingPlan } from '../models/marketplace-listing-plan';
import { MarketplacePurchase } from '../models/marketplace-purchase';
import { Repository } from '../models/repository';
import { UserMarketplacePurchase } from '../models/user-marketplace-purchase';
import { WebhookConfig } from '../models/webhook-config';


/**
 * Information for integrations and installations.
 */
@Injectable({ providedIn: 'root' })
export class AppsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `appsGetAuthenticated()` */
  static readonly AppsGetAuthenticatedPath = '/app';

  /**
   * Get the authenticated app.
   *
   * Returns the GitHub App associated with the authentication credentials used. To see how many app installations are associated with this GitHub App, see the `installations_count` in the response. For more details about your app's installations, see the "[List installations for the authenticated app](https://docs.github.com/rest/apps/apps#list-installations-for-the-authenticated-app)" endpoint.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetAuthenticated()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetAuthenticated$Response(params?: AppsGetAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<Integration>> {
    return appsGetAuthenticated(this.http, this.rootUrl, params, context);
  }

  /**
   * Get the authenticated app.
   *
   * Returns the GitHub App associated with the authentication credentials used. To see how many app installations are associated with this GitHub App, see the `installations_count` in the response. For more details about your app's installations, see the "[List installations for the authenticated app](https://docs.github.com/rest/apps/apps#list-installations-for-the-authenticated-app)" endpoint.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetAuthenticated$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetAuthenticated(params?: AppsGetAuthenticated$Params, context?: HttpContext): Observable<Integration> {
    return this.appsGetAuthenticated$Response(params, context).pipe(
      map((r: StrictHttpResponse<Integration>): Integration => r.body)
    );
  }

  /** Path part for operation `appsCreateFromManifest()` */
  static readonly AppsCreateFromManifestPath = '/app-manifests/{code}/conversions';

  /**
   * Create a GitHub App from a manifest.
   *
   * Use this endpoint to complete the handshake necessary when implementing the [GitHub App Manifest flow](https://docs.github.com/apps/building-github-apps/creating-github-apps-from-a-manifest/). When you create a GitHub App with the manifest flow, you receive a temporary `code` used to retrieve the GitHub App's `id`, `pem` (private key), and `webhook_secret`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsCreateFromManifest()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsCreateFromManifest$Response(params: AppsCreateFromManifest$Params, context?: HttpContext): Observable<StrictHttpResponse<Integration & {
'client_id': string;
'client_secret': string;
'webhook_secret': string | null;
'pem': string;
[key: string]: any;
}>> {
    return appsCreateFromManifest(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a GitHub App from a manifest.
   *
   * Use this endpoint to complete the handshake necessary when implementing the [GitHub App Manifest flow](https://docs.github.com/apps/building-github-apps/creating-github-apps-from-a-manifest/). When you create a GitHub App with the manifest flow, you receive a temporary `code` used to retrieve the GitHub App's `id`, `pem` (private key), and `webhook_secret`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsCreateFromManifest$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsCreateFromManifest(params: AppsCreateFromManifest$Params, context?: HttpContext): Observable<Integration & {
'client_id': string;
'client_secret': string;
'webhook_secret': string | null;
'pem': string;
[key: string]: any;
}> {
    return this.appsCreateFromManifest$Response(params, context).pipe(
      map((r: StrictHttpResponse<Integration & {
'client_id': string;
'client_secret': string;
'webhook_secret': string | null;
'pem': string;
[key: string]: any;
}>): Integration & {
'client_id': string;
'client_secret': string;
'webhook_secret': string | null;
'pem': string;
[key: string]: any;
} => r.body)
    );
  }

  /** Path part for operation `appsGetWebhookConfigForApp()` */
  static readonly AppsGetWebhookConfigForAppPath = '/app/hook/config';

  /**
   * Get a webhook configuration for an app.
   *
   * Returns the webhook configuration for a GitHub App. For more information about configuring a webhook for your app, see "[Creating a GitHub App](/developers/apps/creating-a-github-app)."
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetWebhookConfigForApp()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetWebhookConfigForApp$Response(params?: AppsGetWebhookConfigForApp$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
    return appsGetWebhookConfigForApp(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a webhook configuration for an app.
   *
   * Returns the webhook configuration for a GitHub App. For more information about configuring a webhook for your app, see "[Creating a GitHub App](/developers/apps/creating-a-github-app)."
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetWebhookConfigForApp$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetWebhookConfigForApp(params?: AppsGetWebhookConfigForApp$Params, context?: HttpContext): Observable<WebhookConfig> {
    return this.appsGetWebhookConfigForApp$Response(params, context).pipe(
      map((r: StrictHttpResponse<WebhookConfig>): WebhookConfig => r.body)
    );
  }

  /** Path part for operation `appsUpdateWebhookConfigForApp()` */
  static readonly AppsUpdateWebhookConfigForAppPath = '/app/hook/config';

  /**
   * Update a webhook configuration for an app.
   *
   * Updates the webhook configuration for a GitHub App. For more information about configuring a webhook for your app, see "[Creating a GitHub App](/developers/apps/creating-a-github-app)."
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsUpdateWebhookConfigForApp()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsUpdateWebhookConfigForApp$Response(params: AppsUpdateWebhookConfigForApp$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
    return appsUpdateWebhookConfigForApp(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a webhook configuration for an app.
   *
   * Updates the webhook configuration for a GitHub App. For more information about configuring a webhook for your app, see "[Creating a GitHub App](/developers/apps/creating-a-github-app)."
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsUpdateWebhookConfigForApp$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsUpdateWebhookConfigForApp(params: AppsUpdateWebhookConfigForApp$Params, context?: HttpContext): Observable<WebhookConfig> {
    return this.appsUpdateWebhookConfigForApp$Response(params, context).pipe(
      map((r: StrictHttpResponse<WebhookConfig>): WebhookConfig => r.body)
    );
  }

  /** Path part for operation `appsListWebhookDeliveries()` */
  static readonly AppsListWebhookDeliveriesPath = '/app/hook/deliveries';

  /**
   * List deliveries for an app webhook.
   *
   * Returns a list of webhook deliveries for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListWebhookDeliveries()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListWebhookDeliveries$Response(params?: AppsListWebhookDeliveries$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<HookDeliveryItem>>> {
    return appsListWebhookDeliveries(this.http, this.rootUrl, params, context);
  }

  /**
   * List deliveries for an app webhook.
   *
   * Returns a list of webhook deliveries for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListWebhookDeliveries$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListWebhookDeliveries(params?: AppsListWebhookDeliveries$Params, context?: HttpContext): Observable<Array<HookDeliveryItem>> {
    return this.appsListWebhookDeliveries$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<HookDeliveryItem>>): Array<HookDeliveryItem> => r.body)
    );
  }

  /** Path part for operation `appsGetWebhookDelivery()` */
  static readonly AppsGetWebhookDeliveryPath = '/app/hook/deliveries/{delivery_id}';

  /**
   * Get a delivery for an app webhook.
   *
   * Returns a delivery for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetWebhookDelivery()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetWebhookDelivery$Response(params: AppsGetWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<HookDelivery>> {
    return appsGetWebhookDelivery(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a delivery for an app webhook.
   *
   * Returns a delivery for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetWebhookDelivery$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetWebhookDelivery(params: AppsGetWebhookDelivery$Params, context?: HttpContext): Observable<HookDelivery> {
    return this.appsGetWebhookDelivery$Response(params, context).pipe(
      map((r: StrictHttpResponse<HookDelivery>): HookDelivery => r.body)
    );
  }

  /** Path part for operation `appsRedeliverWebhookDelivery()` */
  static readonly AppsRedeliverWebhookDeliveryPath = '/app/hook/deliveries/{delivery_id}/attempts';

  /**
   * Redeliver a delivery for an app webhook.
   *
   * Redeliver a delivery for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsRedeliverWebhookDelivery()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRedeliverWebhookDelivery$Response(params: AppsRedeliverWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return appsRedeliverWebhookDelivery(this.http, this.rootUrl, params, context);
  }

  /**
   * Redeliver a delivery for an app webhook.
   *
   * Redeliver a delivery for the webhook configured for a GitHub App.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsRedeliverWebhookDelivery$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRedeliverWebhookDelivery(params: AppsRedeliverWebhookDelivery$Params, context?: HttpContext): Observable<{
}> {
    return this.appsRedeliverWebhookDelivery$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `appsListInstallationRequestsForAuthenticatedApp()` */
  static readonly AppsListInstallationRequestsForAuthenticatedAppPath = '/app/installation-requests';

  /**
   * List installation requests for the authenticated app.
   *
   * Lists all the pending installation requests for the authenticated GitHub App.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListInstallationRequestsForAuthenticatedApp()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationRequestsForAuthenticatedApp$Response(params?: AppsListInstallationRequestsForAuthenticatedApp$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<IntegrationInstallationRequest>>> {
    return appsListInstallationRequestsForAuthenticatedApp(this.http, this.rootUrl, params, context);
  }

  /**
   * List installation requests for the authenticated app.
   *
   * Lists all the pending installation requests for the authenticated GitHub App.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListInstallationRequestsForAuthenticatedApp$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationRequestsForAuthenticatedApp(params?: AppsListInstallationRequestsForAuthenticatedApp$Params, context?: HttpContext): Observable<Array<IntegrationInstallationRequest>> {
    return this.appsListInstallationRequestsForAuthenticatedApp$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<IntegrationInstallationRequest>>): Array<IntegrationInstallationRequest> => r.body)
    );
  }

  /** Path part for operation `appsListInstallations()` */
  static readonly AppsListInstallationsPath = '/app/installations';

  /**
   * List installations for the authenticated app.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * The permissions the installation has are included under the `permissions` key.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListInstallations()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallations$Response(params?: AppsListInstallations$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Installation>>> {
    return appsListInstallations(this.http, this.rootUrl, params, context);
  }

  /**
   * List installations for the authenticated app.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * The permissions the installation has are included under the `permissions` key.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListInstallations$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallations(params?: AppsListInstallations$Params, context?: HttpContext): Observable<Array<Installation>> {
    return this.appsListInstallations$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Installation>>): Array<Installation> => r.body)
    );
  }

  /** Path part for operation `appsGetInstallation()` */
  static readonly AppsGetInstallationPath = '/app/installations/{installation_id}';

  /**
   * Get an installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find an installation's information using the installation id.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetInstallation$Response(params: AppsGetInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<Installation>> {
    return appsGetInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find an installation's information using the installation id.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetInstallation(params: AppsGetInstallation$Params, context?: HttpContext): Observable<Installation> {
    return this.appsGetInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<Installation>): Installation => r.body)
    );
  }

  /** Path part for operation `appsDeleteInstallation()` */
  static readonly AppsDeleteInstallationPath = '/app/installations/{installation_id}';

  /**
   * Delete an installation for the authenticated app.
   *
   * Uninstalls a GitHub App on a user, organization, or business account. If you prefer to temporarily suspend an app's access to your account's resources, then we recommend the "[Suspend an app installation](https://docs.github.com/rest/apps/apps#suspend-an-app-installation)" endpoint.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsDeleteInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsDeleteInstallation$Response(params: AppsDeleteInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsDeleteInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an installation for the authenticated app.
   *
   * Uninstalls a GitHub App on a user, organization, or business account. If you prefer to temporarily suspend an app's access to your account's resources, then we recommend the "[Suspend an app installation](https://docs.github.com/rest/apps/apps#suspend-an-app-installation)" endpoint.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsDeleteInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsDeleteInstallation(params: AppsDeleteInstallation$Params, context?: HttpContext): Observable<void> {
    return this.appsDeleteInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsCreateInstallationAccessToken()` */
  static readonly AppsCreateInstallationAccessTokenPath = '/app/installations/{installation_id}/access_tokens';

  /**
   * Create an installation access token for an app.
   *
   * Creates an installation access token that enables a GitHub App to make authenticated API requests for the app's installation on an organization or individual account. Installation tokens expire one hour from the time you create them. Using an expired token produces a status code of `401 - Unauthorized`, and requires creating a new installation token. By default the installation token has access to all repositories that the installation can access. To restrict the access to specific repositories, you can provide the `repository_ids` when creating the token. When you omit `repository_ids`, the response does not contain the `repositories` key.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsCreateInstallationAccessToken()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsCreateInstallationAccessToken$Response(params: AppsCreateInstallationAccessToken$Params, context?: HttpContext): Observable<StrictHttpResponse<InstallationToken>> {
    return appsCreateInstallationAccessToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Create an installation access token for an app.
   *
   * Creates an installation access token that enables a GitHub App to make authenticated API requests for the app's installation on an organization or individual account. Installation tokens expire one hour from the time you create them. Using an expired token produces a status code of `401 - Unauthorized`, and requires creating a new installation token. By default the installation token has access to all repositories that the installation can access. To restrict the access to specific repositories, you can provide the `repository_ids` when creating the token. When you omit `repository_ids`, the response does not contain the `repositories` key.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsCreateInstallationAccessToken$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsCreateInstallationAccessToken(params: AppsCreateInstallationAccessToken$Params, context?: HttpContext): Observable<InstallationToken> {
    return this.appsCreateInstallationAccessToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<InstallationToken>): InstallationToken => r.body)
    );
  }

  /** Path part for operation `appsSuspendInstallation()` */
  static readonly AppsSuspendInstallationPath = '/app/installations/{installation_id}/suspended';

  /**
   * Suspend an app installation.
   *
   * Suspends a GitHub App on a user, organization, or business account, which blocks the app from accessing the account's resources. When a GitHub App is suspended, the app's access to the GitHub API or webhook events is blocked for that account.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsSuspendInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsSuspendInstallation$Response(params: AppsSuspendInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsSuspendInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Suspend an app installation.
   *
   * Suspends a GitHub App on a user, organization, or business account, which blocks the app from accessing the account's resources. When a GitHub App is suspended, the app's access to the GitHub API or webhook events is blocked for that account.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsSuspendInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsSuspendInstallation(params: AppsSuspendInstallation$Params, context?: HttpContext): Observable<void> {
    return this.appsSuspendInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsUnsuspendInstallation()` */
  static readonly AppsUnsuspendInstallationPath = '/app/installations/{installation_id}/suspended';

  /**
   * Unsuspend an app installation.
   *
   * Removes a GitHub App installation suspension.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsUnsuspendInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsUnsuspendInstallation$Response(params: AppsUnsuspendInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsUnsuspendInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Unsuspend an app installation.
   *
   * Removes a GitHub App installation suspension.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsUnsuspendInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsUnsuspendInstallation(params: AppsUnsuspendInstallation$Params, context?: HttpContext): Observable<void> {
    return this.appsUnsuspendInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsDeleteAuthorization()` */
  static readonly AppsDeleteAuthorizationPath = '/applications/{client_id}/grant';

  /**
   * Delete an app authorization.
   *
   * OAuth and GitHub application owners can revoke a grant for their application and a specific user. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the OAuth application's `client_id` and `client_secret` as the username and password. You must also provide a valid OAuth `access_token` as an input parameter and the grant for the token's owner will be deleted.
   * Deleting an application's grant will also delete all OAuth tokens associated with the application for the user. Once deleted, the application will have no access to the user's account and will no longer be listed on [the application authorizations settings screen within GitHub](https://github.com/settings/applications#authorized).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsDeleteAuthorization()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsDeleteAuthorization$Response(params: AppsDeleteAuthorization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsDeleteAuthorization(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an app authorization.
   *
   * OAuth and GitHub application owners can revoke a grant for their application and a specific user. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the OAuth application's `client_id` and `client_secret` as the username and password. You must also provide a valid OAuth `access_token` as an input parameter and the grant for the token's owner will be deleted.
   * Deleting an application's grant will also delete all OAuth tokens associated with the application for the user. Once deleted, the application will have no access to the user's account and will no longer be listed on [the application authorizations settings screen within GitHub](https://github.com/settings/applications#authorized).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsDeleteAuthorization$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsDeleteAuthorization(params: AppsDeleteAuthorization$Params, context?: HttpContext): Observable<void> {
    return this.appsDeleteAuthorization$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsCheckToken()` */
  static readonly AppsCheckTokenPath = '/applications/{client_id}/token';

  /**
   * Check a token.
   *
   * OAuth applications and GitHub applications with OAuth authorizations can use this API method for checking OAuth token validity without exceeding the normal rate limits for failed login attempts. Authentication works differently with this particular endpoint. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) to use this endpoint, where the username is the application `client_id` and the password is its `client_secret`. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsCheckToken()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsCheckToken$Response(params: AppsCheckToken$Params, context?: HttpContext): Observable<StrictHttpResponse<Authorization>> {
    return appsCheckToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Check a token.
   *
   * OAuth applications and GitHub applications with OAuth authorizations can use this API method for checking OAuth token validity without exceeding the normal rate limits for failed login attempts. Authentication works differently with this particular endpoint. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) to use this endpoint, where the username is the application `client_id` and the password is its `client_secret`. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsCheckToken$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsCheckToken(params: AppsCheckToken$Params, context?: HttpContext): Observable<Authorization> {
    return this.appsCheckToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<Authorization>): Authorization => r.body)
    );
  }

  /** Path part for operation `appsDeleteToken()` */
  static readonly AppsDeleteTokenPath = '/applications/{client_id}/token';

  /**
   * Delete an app token.
   *
   * OAuth  or GitHub application owners can revoke a single token for an OAuth application or a GitHub application with an OAuth authorization. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the application's `client_id` and `client_secret` as the username and password.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsDeleteToken()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsDeleteToken$Response(params: AppsDeleteToken$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsDeleteToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an app token.
   *
   * OAuth  or GitHub application owners can revoke a single token for an OAuth application or a GitHub application with an OAuth authorization. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the application's `client_id` and `client_secret` as the username and password.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsDeleteToken$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsDeleteToken(params: AppsDeleteToken$Params, context?: HttpContext): Observable<void> {
    return this.appsDeleteToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsResetToken()` */
  static readonly AppsResetTokenPath = '/applications/{client_id}/token';

  /**
   * Reset a token.
   *
   * OAuth applications and GitHub applications with OAuth authorizations can use this API method to reset a valid OAuth token without end-user involvement. Applications must save the "token" property in the response because changes take effect immediately. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the application's `client_id` and `client_secret` as the username and password. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsResetToken()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsResetToken$Response(params: AppsResetToken$Params, context?: HttpContext): Observable<StrictHttpResponse<Authorization>> {
    return appsResetToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Reset a token.
   *
   * OAuth applications and GitHub applications with OAuth authorizations can use this API method to reset a valid OAuth token without end-user involvement. Applications must save the "token" property in the response because changes take effect immediately. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the application's `client_id` and `client_secret` as the username and password. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsResetToken$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsResetToken(params: AppsResetToken$Params, context?: HttpContext): Observable<Authorization> {
    return this.appsResetToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<Authorization>): Authorization => r.body)
    );
  }

  /** Path part for operation `appsScopeToken()` */
  static readonly AppsScopeTokenPath = '/applications/{client_id}/token/scoped';

  /**
   * Create a scoped access token.
   *
   * Use a non-scoped user access token to create a repository scoped and/or permission scoped user access token. You can specify which repositories the token can access and which permissions are granted to the token. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the `client_id` and `client_secret` of the GitHub App as the username and password. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsScopeToken()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsScopeToken$Response(params: AppsScopeToken$Params, context?: HttpContext): Observable<StrictHttpResponse<Authorization>> {
    return appsScopeToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a scoped access token.
   *
   * Use a non-scoped user access token to create a repository scoped and/or permission scoped user access token. You can specify which repositories the token can access and which permissions are granted to the token. You must use [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) when accessing this endpoint, using the `client_id` and `client_secret` of the GitHub App as the username and password. Invalid tokens will return `404 NOT FOUND`.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsScopeToken$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  appsScopeToken(params: AppsScopeToken$Params, context?: HttpContext): Observable<Authorization> {
    return this.appsScopeToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<Authorization>): Authorization => r.body)
    );
  }

  /** Path part for operation `appsGetBySlug()` */
  static readonly AppsGetBySlugPath = '/apps/{app_slug}';

  /**
   * Get an app.
   *
   * **Note**: The `:app_slug` is just the URL-friendly name of your GitHub App. You can find this on the settings page for your GitHub App (e.g., `https://github.com/settings/apps/:app_slug`).
   *
   * If the GitHub App you specify is public, you can access this endpoint without authenticating. If the GitHub App you specify is private, you must authenticate with a [personal access token](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line/) or an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetBySlug()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetBySlug$Response(params: AppsGetBySlug$Params, context?: HttpContext): Observable<StrictHttpResponse<Integration>> {
    return appsGetBySlug(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an app.
   *
   * **Note**: The `:app_slug` is just the URL-friendly name of your GitHub App. You can find this on the settings page for your GitHub App (e.g., `https://github.com/settings/apps/:app_slug`).
   *
   * If the GitHub App you specify is public, you can access this endpoint without authenticating. If the GitHub App you specify is private, you must authenticate with a [personal access token](https://docs.github.com/articles/creating-a-personal-access-token-for-the-command-line/) or an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetBySlug$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetBySlug(params: AppsGetBySlug$Params, context?: HttpContext): Observable<Integration> {
    return this.appsGetBySlug$Response(params, context).pipe(
      map((r: StrictHttpResponse<Integration>): Integration => r.body)
    );
  }

  /** Path part for operation `appsListReposAccessibleToInstallation()` */
  static readonly AppsListReposAccessibleToInstallationPath = '/installation/repositories';

  /**
   * List repositories accessible to the app installation.
   *
   * List repositories that an app installation can access.
   *
   * You must use an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListReposAccessibleToInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListReposAccessibleToInstallation$Response(params?: AppsListReposAccessibleToInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<Repository>;
'repository_selection'?: string;
}>> {
    return appsListReposAccessibleToInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories accessible to the app installation.
   *
   * List repositories that an app installation can access.
   *
   * You must use an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListReposAccessibleToInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListReposAccessibleToInstallation(params?: AppsListReposAccessibleToInstallation$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<Repository>;
'repository_selection'?: string;
}> {
    return this.appsListReposAccessibleToInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<Repository>;
'repository_selection'?: string;
}>): {
'total_count': number;
'repositories': Array<Repository>;
'repository_selection'?: string;
} => r.body)
    );
  }

  /** Path part for operation `appsRevokeInstallationAccessToken()` */
  static readonly AppsRevokeInstallationAccessTokenPath = '/installation/token';

  /**
   * Revoke an installation access token.
   *
   * Revokes the installation token you're using to authenticate as an installation and access this endpoint.
   *
   * Once an installation token is revoked, the token is invalidated and cannot be used. Other endpoints that require the revoked installation token must have a new installation token to work. You can create a new token using the "[Create an installation access token for an app](https://docs.github.com/rest/apps/apps#create-an-installation-access-token-for-an-app)" endpoint.
   *
   * You must use an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsRevokeInstallationAccessToken()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRevokeInstallationAccessToken$Response(params?: AppsRevokeInstallationAccessToken$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsRevokeInstallationAccessToken(this.http, this.rootUrl, params, context);
  }

  /**
   * Revoke an installation access token.
   *
   * Revokes the installation token you're using to authenticate as an installation and access this endpoint.
   *
   * Once an installation token is revoked, the token is invalidated and cannot be used. Other endpoints that require the revoked installation token must have a new installation token to work. You can create a new token using the "[Create an installation access token for an app](https://docs.github.com/rest/apps/apps#create-an-installation-access-token-for-an-app)" endpoint.
   *
   * You must use an [installation access token](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsRevokeInstallationAccessToken$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRevokeInstallationAccessToken(params?: AppsRevokeInstallationAccessToken$Params, context?: HttpContext): Observable<void> {
    return this.appsRevokeInstallationAccessToken$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsGetSubscriptionPlanForAccount()` */
  static readonly AppsGetSubscriptionPlanForAccountPath = '/marketplace_listing/accounts/{account_id}';

  /**
   * Get a subscription plan for an account.
   *
   * Shows whether the user or organization account actively subscribes to a plan listed by the authenticated GitHub App. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetSubscriptionPlanForAccount()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetSubscriptionPlanForAccount$Response(params: AppsGetSubscriptionPlanForAccount$Params, context?: HttpContext): Observable<StrictHttpResponse<MarketplacePurchase>> {
    return appsGetSubscriptionPlanForAccount(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a subscription plan for an account.
   *
   * Shows whether the user or organization account actively subscribes to a plan listed by the authenticated GitHub App. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetSubscriptionPlanForAccount$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetSubscriptionPlanForAccount(params: AppsGetSubscriptionPlanForAccount$Params, context?: HttpContext): Observable<MarketplacePurchase> {
    return this.appsGetSubscriptionPlanForAccount$Response(params, context).pipe(
      map((r: StrictHttpResponse<MarketplacePurchase>): MarketplacePurchase => r.body)
    );
  }

  /** Path part for operation `appsListPlans()` */
  static readonly AppsListPlansPath = '/marketplace_listing/plans';

  /**
   * List plans.
   *
   * Lists all plans that are part of your GitHub Marketplace listing.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListPlans()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListPlans$Response(params?: AppsListPlans$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MarketplaceListingPlan>>> {
    return appsListPlans(this.http, this.rootUrl, params, context);
  }

  /**
   * List plans.
   *
   * Lists all plans that are part of your GitHub Marketplace listing.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListPlans$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListPlans(params?: AppsListPlans$Params, context?: HttpContext): Observable<Array<MarketplaceListingPlan>> {
    return this.appsListPlans$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MarketplaceListingPlan>>): Array<MarketplaceListingPlan> => r.body)
    );
  }

  /** Path part for operation `appsListAccountsForPlan()` */
  static readonly AppsListAccountsForPlanPath = '/marketplace_listing/plans/{plan_id}/accounts';

  /**
   * List accounts for a plan.
   *
   * Returns user and organization accounts associated with the specified plan, including free plans. For per-seat pricing, you see the list of accounts that have purchased the plan, including the number of seats purchased. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListAccountsForPlan()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListAccountsForPlan$Response(params: AppsListAccountsForPlan$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MarketplacePurchase>>> {
    return appsListAccountsForPlan(this.http, this.rootUrl, params, context);
  }

  /**
   * List accounts for a plan.
   *
   * Returns user and organization accounts associated with the specified plan, including free plans. For per-seat pricing, you see the list of accounts that have purchased the plan, including the number of seats purchased. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListAccountsForPlan$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListAccountsForPlan(params: AppsListAccountsForPlan$Params, context?: HttpContext): Observable<Array<MarketplacePurchase>> {
    return this.appsListAccountsForPlan$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MarketplacePurchase>>): Array<MarketplacePurchase> => r.body)
    );
  }

  /** Path part for operation `appsGetSubscriptionPlanForAccountStubbed()` */
  static readonly AppsGetSubscriptionPlanForAccountStubbedPath = '/marketplace_listing/stubbed/accounts/{account_id}';

  /**
   * Get a subscription plan for an account (stubbed).
   *
   * Shows whether the user or organization account actively subscribes to a plan listed by the authenticated GitHub App. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetSubscriptionPlanForAccountStubbed()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetSubscriptionPlanForAccountStubbed$Response(params: AppsGetSubscriptionPlanForAccountStubbed$Params, context?: HttpContext): Observable<StrictHttpResponse<MarketplacePurchase>> {
    return appsGetSubscriptionPlanForAccountStubbed(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a subscription plan for an account (stubbed).
   *
   * Shows whether the user or organization account actively subscribes to a plan listed by the authenticated GitHub App. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetSubscriptionPlanForAccountStubbed$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetSubscriptionPlanForAccountStubbed(params: AppsGetSubscriptionPlanForAccountStubbed$Params, context?: HttpContext): Observable<MarketplacePurchase> {
    return this.appsGetSubscriptionPlanForAccountStubbed$Response(params, context).pipe(
      map((r: StrictHttpResponse<MarketplacePurchase>): MarketplacePurchase => r.body)
    );
  }

  /** Path part for operation `appsListPlansStubbed()` */
  static readonly AppsListPlansStubbedPath = '/marketplace_listing/stubbed/plans';

  /**
   * List plans (stubbed).
   *
   * Lists all plans that are part of your GitHub Marketplace listing.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListPlansStubbed()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListPlansStubbed$Response(params?: AppsListPlansStubbed$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MarketplaceListingPlan>>> {
    return appsListPlansStubbed(this.http, this.rootUrl, params, context);
  }

  /**
   * List plans (stubbed).
   *
   * Lists all plans that are part of your GitHub Marketplace listing.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListPlansStubbed$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListPlansStubbed(params?: AppsListPlansStubbed$Params, context?: HttpContext): Observable<Array<MarketplaceListingPlan>> {
    return this.appsListPlansStubbed$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MarketplaceListingPlan>>): Array<MarketplaceListingPlan> => r.body)
    );
  }

  /** Path part for operation `appsListAccountsForPlanStubbed()` */
  static readonly AppsListAccountsForPlanStubbedPath = '/marketplace_listing/stubbed/plans/{plan_id}/accounts';

  /**
   * List accounts for a plan (stubbed).
   *
   * Returns repository and organization accounts associated with the specified plan, including free plans. For per-seat pricing, you see the list of accounts that have purchased the plan, including the number of seats purchased. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListAccountsForPlanStubbed()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListAccountsForPlanStubbed$Response(params: AppsListAccountsForPlanStubbed$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MarketplacePurchase>>> {
    return appsListAccountsForPlanStubbed(this.http, this.rootUrl, params, context);
  }

  /**
   * List accounts for a plan (stubbed).
   *
   * Returns repository and organization accounts associated with the specified plan, including free plans. For per-seat pricing, you see the list of accounts that have purchased the plan, including the number of seats purchased. When someone submits a plan change that won't be processed until the end of their billing cycle, you will also see the upcoming pending change.
   *
   * GitHub Apps must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint. OAuth apps must use [basic authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication) with their client ID and client secret to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListAccountsForPlanStubbed$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListAccountsForPlanStubbed(params: AppsListAccountsForPlanStubbed$Params, context?: HttpContext): Observable<Array<MarketplacePurchase>> {
    return this.appsListAccountsForPlanStubbed$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<MarketplacePurchase>>): Array<MarketplacePurchase> => r.body)
    );
  }

  /** Path part for operation `appsGetOrgInstallation()` */
  static readonly AppsGetOrgInstallationPath = '/orgs/{org}/installation';

  /**
   * Get an organization installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the organization's installation information.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetOrgInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetOrgInstallation$Response(params: AppsGetOrgInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<Installation>> {
    return appsGetOrgInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the organization's installation information.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetOrgInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetOrgInstallation(params: AppsGetOrgInstallation$Params, context?: HttpContext): Observable<Installation> {
    return this.appsGetOrgInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<Installation>): Installation => r.body)
    );
  }

  /** Path part for operation `appsGetRepoInstallation()` */
  static readonly AppsGetRepoInstallationPath = '/repos/{owner}/{repo}/installation';

  /**
   * Get a repository installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the repository's installation information. The installation's account type will be either an organization or a user account, depending which account the repository belongs to.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetRepoInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetRepoInstallation$Response(params: AppsGetRepoInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<Installation>> {
    return appsGetRepoInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the repository's installation information. The installation's account type will be either an organization or a user account, depending which account the repository belongs to.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetRepoInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetRepoInstallation(params: AppsGetRepoInstallation$Params, context?: HttpContext): Observable<Installation> {
    return this.appsGetRepoInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<Installation>): Installation => r.body)
    );
  }

  /** Path part for operation `appsListInstallationsForAuthenticatedUser()` */
  static readonly AppsListInstallationsForAuthenticatedUserPath = '/user/installations';

  /**
   * List app installations accessible to the user access token.
   *
   * Lists installations of your GitHub App that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access.
   *
   * You must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * You can find the permissions for the installation under the `permissions` key.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListInstallationsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationsForAuthenticatedUser$Response(params?: AppsListInstallationsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'installations': Array<Installation>;
}>> {
    return appsListInstallationsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List app installations accessible to the user access token.
   *
   * Lists installations of your GitHub App that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access.
   *
   * You must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * You can find the permissions for the installation under the `permissions` key.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListInstallationsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationsForAuthenticatedUser(params?: AppsListInstallationsForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'installations': Array<Installation>;
}> {
    return this.appsListInstallationsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'installations': Array<Installation>;
}>): {
'total_count': number;
'installations': Array<Installation>;
} => r.body)
    );
  }

  /** Path part for operation `appsListInstallationReposForAuthenticatedUser()` */
  static readonly AppsListInstallationReposForAuthenticatedUserPath = '/user/installations/{installation_id}/repositories';

  /**
   * List repositories accessible to the user access token.
   *
   * List repositories that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access for an installation.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * You must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint.
   *
   * The access the user has to each repository is included in the hash under the `permissions` key.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListInstallationReposForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationReposForAuthenticatedUser$Response(params: AppsListInstallationReposForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repository_selection'?: string;
'repositories': Array<Repository>;
}>> {
    return appsListInstallationReposForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List repositories accessible to the user access token.
   *
   * List repositories that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access for an installation.
   *
   * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
   *
   * You must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint.
   *
   * The access the user has to each repository is included in the hash under the `permissions` key.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListInstallationReposForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListInstallationReposForAuthenticatedUser(params: AppsListInstallationReposForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'repository_selection'?: string;
'repositories': Array<Repository>;
}> {
    return this.appsListInstallationReposForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repository_selection'?: string;
'repositories': Array<Repository>;
}>): {
'total_count': number;
'repository_selection'?: string;
'repositories': Array<Repository>;
} => r.body)
    );
  }

  /** Path part for operation `appsAddRepoToInstallationForAuthenticatedUser()` */
  static readonly AppsAddRepoToInstallationForAuthenticatedUserPath = '/user/installations/{installation_id}/repositories/{repository_id}';

  /**
   * Add a repository to an app installation.
   *
   * Add a single repository to an installation. The authenticated user must have admin access to the repository.
   *
   * You must use a personal access token (which you can create via the [command line](https://docs.github.com/github/authenticating-to-github/creating-a-personal-access-token) or [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication)) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsAddRepoToInstallationForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsAddRepoToInstallationForAuthenticatedUser$Response(params: AppsAddRepoToInstallationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsAddRepoToInstallationForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Add a repository to an app installation.
   *
   * Add a single repository to an installation. The authenticated user must have admin access to the repository.
   *
   * You must use a personal access token (which you can create via the [command line](https://docs.github.com/github/authenticating-to-github/creating-a-personal-access-token) or [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication)) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsAddRepoToInstallationForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsAddRepoToInstallationForAuthenticatedUser(params: AppsAddRepoToInstallationForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.appsAddRepoToInstallationForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsRemoveRepoFromInstallationForAuthenticatedUser()` */
  static readonly AppsRemoveRepoFromInstallationForAuthenticatedUserPath = '/user/installations/{installation_id}/repositories/{repository_id}';

  /**
   * Remove a repository from an app installation.
   *
   * Remove a single repository from an installation. The authenticated user must have admin access to the repository. The installation must have the `repository_selection` of `selected`.
   *
   * You must use a personal access token (which you can create via the [command line](https://docs.github.com/github/authenticating-to-github/creating-a-personal-access-token) or [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication)) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsRemoveRepoFromInstallationForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRemoveRepoFromInstallationForAuthenticatedUser$Response(params: AppsRemoveRepoFromInstallationForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return appsRemoveRepoFromInstallationForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a repository from an app installation.
   *
   * Remove a single repository from an installation. The authenticated user must have admin access to the repository. The installation must have the `repository_selection` of `selected`.
   *
   * You must use a personal access token (which you can create via the [command line](https://docs.github.com/github/authenticating-to-github/creating-a-personal-access-token) or [Basic Authentication](https://docs.github.com/rest/overview/other-authentication-methods#basic-authentication)) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsRemoveRepoFromInstallationForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsRemoveRepoFromInstallationForAuthenticatedUser(params: AppsRemoveRepoFromInstallationForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.appsRemoveRepoFromInstallationForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `appsListSubscriptionsForAuthenticatedUser()` */
  static readonly AppsListSubscriptionsForAuthenticatedUserPath = '/user/marketplace_purchases';

  /**
   * List subscriptions for the authenticated user.
   *
   * Lists the active subscriptions for the authenticated user. GitHub Apps must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint. OAuth apps must authenticate using an [OAuth token](https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListSubscriptionsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListSubscriptionsForAuthenticatedUser$Response(params?: AppsListSubscriptionsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<UserMarketplacePurchase>>> {
    return appsListSubscriptionsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List subscriptions for the authenticated user.
   *
   * Lists the active subscriptions for the authenticated user. GitHub Apps must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint. OAuth apps must authenticate using an [OAuth token](https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListSubscriptionsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListSubscriptionsForAuthenticatedUser(params?: AppsListSubscriptionsForAuthenticatedUser$Params, context?: HttpContext): Observable<Array<UserMarketplacePurchase>> {
    return this.appsListSubscriptionsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<UserMarketplacePurchase>>): Array<UserMarketplacePurchase> => r.body)
    );
  }

  /** Path part for operation `appsListSubscriptionsForAuthenticatedUserStubbed()` */
  static readonly AppsListSubscriptionsForAuthenticatedUserStubbedPath = '/user/marketplace_purchases/stubbed';

  /**
   * List subscriptions for the authenticated user (stubbed).
   *
   * Lists the active subscriptions for the authenticated user. GitHub Apps must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint. OAuth apps must authenticate using an [OAuth token](https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsListSubscriptionsForAuthenticatedUserStubbed()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListSubscriptionsForAuthenticatedUserStubbed$Response(params?: AppsListSubscriptionsForAuthenticatedUserStubbed$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<UserMarketplacePurchase>>> {
    return appsListSubscriptionsForAuthenticatedUserStubbed(this.http, this.rootUrl, params, context);
  }

  /**
   * List subscriptions for the authenticated user (stubbed).
   *
   * Lists the active subscriptions for the authenticated user. GitHub Apps must use a [user access token](https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), created for a user who has authorized your GitHub App, to access this endpoint. OAuth apps must authenticate using an [OAuth token](https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsListSubscriptionsForAuthenticatedUserStubbed$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsListSubscriptionsForAuthenticatedUserStubbed(params?: AppsListSubscriptionsForAuthenticatedUserStubbed$Params, context?: HttpContext): Observable<Array<UserMarketplacePurchase>> {
    return this.appsListSubscriptionsForAuthenticatedUserStubbed$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<UserMarketplacePurchase>>): Array<UserMarketplacePurchase> => r.body)
    );
  }

  /** Path part for operation `appsGetUserInstallation()` */
  static readonly AppsGetUserInstallationPath = '/users/{username}/installation';

  /**
   * Get a user installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the user’s installation information.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `appsGetUserInstallation()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetUserInstallation$Response(params: AppsGetUserInstallation$Params, context?: HttpContext): Observable<StrictHttpResponse<Installation>> {
    return appsGetUserInstallation(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a user installation for the authenticated app.
   *
   * Enables an authenticated GitHub App to find the user’s installation information.
   *
   * You must use a [JWT](https://docs.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) to access this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `appsGetUserInstallation$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  appsGetUserInstallation(params: AppsGetUserInstallation$Params, context?: HttpContext): Observable<Installation> {
    return this.appsGetUserInstallation$Response(params, context).pipe(
      map((r: StrictHttpResponse<Installation>): Installation => r.body)
    );
  }

}
