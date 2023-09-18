/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { ActionsBillingUsage } from '../models/actions-billing-usage';
import { billingGetGithubActionsBillingOrg } from '../fn/billing/billing-get-github-actions-billing-org';
import { BillingGetGithubActionsBillingOrg$Params } from '../fn/billing/billing-get-github-actions-billing-org';
import { billingGetGithubActionsBillingUser } from '../fn/billing/billing-get-github-actions-billing-user';
import { BillingGetGithubActionsBillingUser$Params } from '../fn/billing/billing-get-github-actions-billing-user';
import { billingGetGithubPackagesBillingOrg } from '../fn/billing/billing-get-github-packages-billing-org';
import { BillingGetGithubPackagesBillingOrg$Params } from '../fn/billing/billing-get-github-packages-billing-org';
import { billingGetGithubPackagesBillingUser } from '../fn/billing/billing-get-github-packages-billing-user';
import { BillingGetGithubPackagesBillingUser$Params } from '../fn/billing/billing-get-github-packages-billing-user';
import { billingGetSharedStorageBillingOrg } from '../fn/billing/billing-get-shared-storage-billing-org';
import { BillingGetSharedStorageBillingOrg$Params } from '../fn/billing/billing-get-shared-storage-billing-org';
import { billingGetSharedStorageBillingUser } from '../fn/billing/billing-get-shared-storage-billing-user';
import { BillingGetSharedStorageBillingUser$Params } from '../fn/billing/billing-get-shared-storage-billing-user';
import { CombinedBillingUsage } from '../models/combined-billing-usage';
import { PackagesBillingUsage } from '../models/packages-billing-usage';


/**
 * Monitor charges and usage from Actions and Packages.
 */
@Injectable({ providedIn: 'root' })
export class BillingService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `billingGetGithubActionsBillingOrg()` */
  static readonly BillingGetGithubActionsBillingOrgPath = '/orgs/{org}/settings/billing/actions';

  /**
   * Get GitHub Actions billing for an organization.
   *
   * Gets the summary of the free and paid GitHub Actions minutes used.
   *
   * Paid minutes only apply to workflows in private repositories that use GitHub-hosted runners. Minutes used is listed for each GitHub-hosted runner operating system. Any job re-runs are also included in the usage. The usage returned includes any minute multipliers for macOS and Windows runners, and is rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetGithubActionsBillingOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubActionsBillingOrg$Response(params: BillingGetGithubActionsBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsBillingUsage>> {
    return billingGetGithubActionsBillingOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions billing for an organization.
   *
   * Gets the summary of the free and paid GitHub Actions minutes used.
   *
   * Paid minutes only apply to workflows in private repositories that use GitHub-hosted runners. Minutes used is listed for each GitHub-hosted runner operating system. Any job re-runs are also included in the usage. The usage returned includes any minute multipliers for macOS and Windows runners, and is rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetGithubActionsBillingOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubActionsBillingOrg(params: BillingGetGithubActionsBillingOrg$Params, context?: HttpContext): Observable<ActionsBillingUsage> {
    return this.billingGetGithubActionsBillingOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsBillingUsage>): ActionsBillingUsage => r.body)
    );
  }

  /** Path part for operation `billingGetGithubPackagesBillingOrg()` */
  static readonly BillingGetGithubPackagesBillingOrgPath = '/orgs/{org}/settings/billing/packages';

  /**
   * Get GitHub Packages billing for an organization.
   *
   * Gets the free and paid storage used for GitHub Packages in gigabytes.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetGithubPackagesBillingOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubPackagesBillingOrg$Response(params: BillingGetGithubPackagesBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<PackagesBillingUsage>> {
    return billingGetGithubPackagesBillingOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Packages billing for an organization.
   *
   * Gets the free and paid storage used for GitHub Packages in gigabytes.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetGithubPackagesBillingOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubPackagesBillingOrg(params: BillingGetGithubPackagesBillingOrg$Params, context?: HttpContext): Observable<PackagesBillingUsage> {
    return this.billingGetGithubPackagesBillingOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<PackagesBillingUsage>): PackagesBillingUsage => r.body)
    );
  }

  /** Path part for operation `billingGetSharedStorageBillingOrg()` */
  static readonly BillingGetSharedStorageBillingOrgPath = '/orgs/{org}/settings/billing/shared-storage';

  /**
   * Get shared storage billing for an organization.
   *
   * Gets the estimated paid and estimated total storage used for GitHub Actions and GitHub Packages.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetSharedStorageBillingOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetSharedStorageBillingOrg$Response(params: BillingGetSharedStorageBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<CombinedBillingUsage>> {
    return billingGetSharedStorageBillingOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * Get shared storage billing for an organization.
   *
   * Gets the estimated paid and estimated total storage used for GitHub Actions and GitHub Packages.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `repo` or `admin:org` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetSharedStorageBillingOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetSharedStorageBillingOrg(params: BillingGetSharedStorageBillingOrg$Params, context?: HttpContext): Observable<CombinedBillingUsage> {
    return this.billingGetSharedStorageBillingOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<CombinedBillingUsage>): CombinedBillingUsage => r.body)
    );
  }

  /** Path part for operation `billingGetGithubActionsBillingUser()` */
  static readonly BillingGetGithubActionsBillingUserPath = '/users/{username}/settings/billing/actions';

  /**
   * Get GitHub Actions billing for a user.
   *
   * Gets the summary of the free and paid GitHub Actions minutes used.
   *
   * Paid minutes only apply to workflows in private repositories that use GitHub-hosted runners. Minutes used is listed for each GitHub-hosted runner operating system. Any job re-runs are also included in the usage. The usage returned includes any minute multipliers for macOS and Windows runners, and is rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetGithubActionsBillingUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubActionsBillingUser$Response(params: BillingGetGithubActionsBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsBillingUsage>> {
    return billingGetGithubActionsBillingUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Actions billing for a user.
   *
   * Gets the summary of the free and paid GitHub Actions minutes used.
   *
   * Paid minutes only apply to workflows in private repositories that use GitHub-hosted runners. Minutes used is listed for each GitHub-hosted runner operating system. Any job re-runs are also included in the usage. The usage returned includes any minute multipliers for macOS and Windows runners, and is rounded up to the nearest whole minute. For more information, see "[Managing billing for GitHub Actions](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-actions)".
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetGithubActionsBillingUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubActionsBillingUser(params: BillingGetGithubActionsBillingUser$Params, context?: HttpContext): Observable<ActionsBillingUsage> {
    return this.billingGetGithubActionsBillingUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<ActionsBillingUsage>): ActionsBillingUsage => r.body)
    );
  }

  /** Path part for operation `billingGetGithubPackagesBillingUser()` */
  static readonly BillingGetGithubPackagesBillingUserPath = '/users/{username}/settings/billing/packages';

  /**
   * Get GitHub Packages billing for a user.
   *
   * Gets the free and paid storage used for GitHub Packages in gigabytes.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetGithubPackagesBillingUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubPackagesBillingUser$Response(params: BillingGetGithubPackagesBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<PackagesBillingUsage>> {
    return billingGetGithubPackagesBillingUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get GitHub Packages billing for a user.
   *
   * Gets the free and paid storage used for GitHub Packages in gigabytes.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetGithubPackagesBillingUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetGithubPackagesBillingUser(params: BillingGetGithubPackagesBillingUser$Params, context?: HttpContext): Observable<PackagesBillingUsage> {
    return this.billingGetGithubPackagesBillingUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<PackagesBillingUsage>): PackagesBillingUsage => r.body)
    );
  }

  /** Path part for operation `billingGetSharedStorageBillingUser()` */
  static readonly BillingGetSharedStorageBillingUserPath = '/users/{username}/settings/billing/shared-storage';

  /**
   * Get shared storage billing for a user.
   *
   * Gets the estimated paid and estimated total storage used for GitHub Actions and GitHub Packages.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `billingGetSharedStorageBillingUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetSharedStorageBillingUser$Response(params: BillingGetSharedStorageBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CombinedBillingUsage>> {
    return billingGetSharedStorageBillingUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get shared storage billing for a user.
   *
   * Gets the estimated paid and estimated total storage used for GitHub Actions and GitHub Packages.
   *
   * Paid minutes only apply to packages stored for private repositories. For more information, see "[Managing billing for GitHub Packages](https://docs.github.com/github/setting-up-and-managing-billing-and-payments-on-github/managing-billing-for-github-packages)."
   *
   * Access tokens must have the `user` scope.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `billingGetSharedStorageBillingUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  billingGetSharedStorageBillingUser(params: BillingGetSharedStorageBillingUser$Params, context?: HttpContext): Observable<CombinedBillingUsage> {
    return this.billingGetSharedStorageBillingUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CombinedBillingUsage>): CombinedBillingUsage => r.body)
    );
  }

}
