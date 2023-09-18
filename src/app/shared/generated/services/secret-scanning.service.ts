/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { OrganizationSecretScanningAlert } from '../models/organization-secret-scanning-alert';
import { SecretScanningAlert } from '../models/secret-scanning-alert';
import { SecretScanningLocation } from '../models/secret-scanning-location';
import { secretScanningGetAlert } from '../fn/secret-scanning/secret-scanning-get-alert';
import { SecretScanningGetAlert$Params } from '../fn/secret-scanning/secret-scanning-get-alert';
import { secretScanningListAlertsForEnterprise } from '../fn/secret-scanning/secret-scanning-list-alerts-for-enterprise';
import { SecretScanningListAlertsForEnterprise$Params } from '../fn/secret-scanning/secret-scanning-list-alerts-for-enterprise';
import { secretScanningListAlertsForOrg } from '../fn/secret-scanning/secret-scanning-list-alerts-for-org';
import { SecretScanningListAlertsForOrg$Params } from '../fn/secret-scanning/secret-scanning-list-alerts-for-org';
import { secretScanningListAlertsForRepo } from '../fn/secret-scanning/secret-scanning-list-alerts-for-repo';
import { SecretScanningListAlertsForRepo$Params } from '../fn/secret-scanning/secret-scanning-list-alerts-for-repo';
import { secretScanningListLocationsForAlert } from '../fn/secret-scanning/secret-scanning-list-locations-for-alert';
import { SecretScanningListLocationsForAlert$Params } from '../fn/secret-scanning/secret-scanning-list-locations-for-alert';
import { secretScanningUpdateAlert } from '../fn/secret-scanning/secret-scanning-update-alert';
import { SecretScanningUpdateAlert$Params } from '../fn/secret-scanning/secret-scanning-update-alert';


/**
 * Retrieve secret scanning alerts from a repository.
 */
@Injectable({ providedIn: 'root' })
export class SecretScanningService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `secretScanningListAlertsForEnterprise()` */
  static readonly SecretScanningListAlertsForEnterprisePath = '/enterprises/{enterprise}/secret-scanning/alerts';

  /**
   * List secret scanning alerts for an enterprise.
   *
   * Lists secret scanning alerts for eligible repositories in an enterprise, from newest to oldest.
   * To use this endpoint, you must be a member of the enterprise, and you must use an access token with the `repo` scope or `security_events` scope. Alerts are only returned for organizations in the enterprise for which you are an organization owner or a [security manager](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningListAlertsForEnterprise()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForEnterprise$Response(params: SecretScanningListAlertsForEnterprise$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationSecretScanningAlert>>> {
    return secretScanningListAlertsForEnterprise(this.http, this.rootUrl, params, context);
  }

  /**
   * List secret scanning alerts for an enterprise.
   *
   * Lists secret scanning alerts for eligible repositories in an enterprise, from newest to oldest.
   * To use this endpoint, you must be a member of the enterprise, and you must use an access token with the `repo` scope or `security_events` scope. Alerts are only returned for organizations in the enterprise for which you are an organization owner or a [security manager](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningListAlertsForEnterprise$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForEnterprise(params: SecretScanningListAlertsForEnterprise$Params, context?: HttpContext): Observable<Array<OrganizationSecretScanningAlert>> {
    return this.secretScanningListAlertsForEnterprise$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<OrganizationSecretScanningAlert>>): Array<OrganizationSecretScanningAlert> => r.body)
    );
  }

  /** Path part for operation `secretScanningListAlertsForOrg()` */
  static readonly SecretScanningListAlertsForOrgPath = '/orgs/{org}/secret-scanning/alerts';

  /**
   * List secret scanning alerts for an organization.
   *
   * Lists secret scanning alerts for eligible repositories in an organization, from newest to oldest.
   * To use this endpoint, you must be an administrator or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningListAlertsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForOrg$Response(params: SecretScanningListAlertsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationSecretScanningAlert>>> {
    return secretScanningListAlertsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List secret scanning alerts for an organization.
   *
   * Lists secret scanning alerts for eligible repositories in an organization, from newest to oldest.
   * To use this endpoint, you must be an administrator or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningListAlertsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForOrg(params: SecretScanningListAlertsForOrg$Params, context?: HttpContext): Observable<Array<OrganizationSecretScanningAlert>> {
    return this.secretScanningListAlertsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<OrganizationSecretScanningAlert>>): Array<OrganizationSecretScanningAlert> => r.body)
    );
  }

  /** Path part for operation `secretScanningListAlertsForRepo()` */
  static readonly SecretScanningListAlertsForRepoPath = '/repos/{owner}/{repo}/secret-scanning/alerts';

  /**
   * List secret scanning alerts for a repository.
   *
   * Lists secret scanning alerts for an eligible repository, from newest to oldest.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningListAlertsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForRepo$Response(params: SecretScanningListAlertsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SecretScanningAlert>>> {
    return secretScanningListAlertsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List secret scanning alerts for a repository.
   *
   * Lists secret scanning alerts for an eligible repository, from newest to oldest.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningListAlertsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListAlertsForRepo(params: SecretScanningListAlertsForRepo$Params, context?: HttpContext): Observable<Array<SecretScanningAlert>> {
    return this.secretScanningListAlertsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SecretScanningAlert>>): Array<SecretScanningAlert> => r.body)
    );
  }

  /** Path part for operation `secretScanningGetAlert()` */
  static readonly SecretScanningGetAlertPath = '/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}';

  /**
   * Get a secret scanning alert.
   *
   * Gets a single secret scanning alert detected in an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningGetAlert()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningGetAlert$Response(params: SecretScanningGetAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<SecretScanningAlert>> {
    return secretScanningGetAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a secret scanning alert.
   *
   * Gets a single secret scanning alert detected in an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningGetAlert$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningGetAlert(params: SecretScanningGetAlert$Params, context?: HttpContext): Observable<SecretScanningAlert> {
    return this.secretScanningGetAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<SecretScanningAlert>): SecretScanningAlert => r.body)
    );
  }

  /** Path part for operation `secretScanningUpdateAlert()` */
  static readonly SecretScanningUpdateAlertPath = '/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}';

  /**
   * Update a secret scanning alert.
   *
   * Updates the status of a secret scanning alert in an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` write permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningUpdateAlert()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  secretScanningUpdateAlert$Response(params: SecretScanningUpdateAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<SecretScanningAlert>> {
    return secretScanningUpdateAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a secret scanning alert.
   *
   * Updates the status of a secret scanning alert in an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` write permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningUpdateAlert$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  secretScanningUpdateAlert(params: SecretScanningUpdateAlert$Params, context?: HttpContext): Observable<SecretScanningAlert> {
    return this.secretScanningUpdateAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<SecretScanningAlert>): SecretScanningAlert => r.body)
    );
  }

  /** Path part for operation `secretScanningListLocationsForAlert()` */
  static readonly SecretScanningListLocationsForAlertPath = '/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations';

  /**
   * List locations for a secret scanning alert.
   *
   * Lists all locations for a given secret scanning alert for an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `secretScanningListLocationsForAlert()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListLocationsForAlert$Response(params: SecretScanningListLocationsForAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SecretScanningLocation>>> {
    return secretScanningListLocationsForAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * List locations for a secret scanning alert.
   *
   * Lists all locations for a given secret scanning alert for an eligible repository.
   * To use this endpoint, you must be an administrator for the repository or for the organization that owns the repository, and you must use a personal access token with the `repo` scope or `security_events` scope.
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `secret_scanning_alerts` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `secretScanningListLocationsForAlert$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  secretScanningListLocationsForAlert(params: SecretScanningListLocationsForAlert$Params, context?: HttpContext): Observable<Array<SecretScanningLocation>> {
    return this.secretScanningListLocationsForAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SecretScanningLocation>>): Array<SecretScanningLocation> => r.body)
    );
  }

}
