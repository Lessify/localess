/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { DependabotAlert } from '../models/dependabot-alert';
import { DependabotAlertWithRepository } from '../models/dependabot-alert-with-repository';
import { DependabotPublicKey } from '../models/dependabot-public-key';
import { DependabotSecret } from '../models/dependabot-secret';
import { dependabotAddSelectedRepoToOrgSecret } from '../fn/dependabot/dependabot-add-selected-repo-to-org-secret';
import { DependabotAddSelectedRepoToOrgSecret$Params } from '../fn/dependabot/dependabot-add-selected-repo-to-org-secret';
import { dependabotCreateOrUpdateOrgSecret } from '../fn/dependabot/dependabot-create-or-update-org-secret';
import { DependabotCreateOrUpdateOrgSecret$Params } from '../fn/dependabot/dependabot-create-or-update-org-secret';
import { dependabotCreateOrUpdateRepoSecret } from '../fn/dependabot/dependabot-create-or-update-repo-secret';
import { DependabotCreateOrUpdateRepoSecret$Params } from '../fn/dependabot/dependabot-create-or-update-repo-secret';
import { dependabotDeleteOrgSecret } from '../fn/dependabot/dependabot-delete-org-secret';
import { DependabotDeleteOrgSecret$Params } from '../fn/dependabot/dependabot-delete-org-secret';
import { dependabotDeleteRepoSecret } from '../fn/dependabot/dependabot-delete-repo-secret';
import { DependabotDeleteRepoSecret$Params } from '../fn/dependabot/dependabot-delete-repo-secret';
import { dependabotGetAlert } from '../fn/dependabot/dependabot-get-alert';
import { DependabotGetAlert$Params } from '../fn/dependabot/dependabot-get-alert';
import { dependabotGetOrgPublicKey } from '../fn/dependabot/dependabot-get-org-public-key';
import { DependabotGetOrgPublicKey$Params } from '../fn/dependabot/dependabot-get-org-public-key';
import { dependabotGetOrgSecret } from '../fn/dependabot/dependabot-get-org-secret';
import { DependabotGetOrgSecret$Params } from '../fn/dependabot/dependabot-get-org-secret';
import { dependabotGetRepoPublicKey } from '../fn/dependabot/dependabot-get-repo-public-key';
import { DependabotGetRepoPublicKey$Params } from '../fn/dependabot/dependabot-get-repo-public-key';
import { dependabotGetRepoSecret } from '../fn/dependabot/dependabot-get-repo-secret';
import { DependabotGetRepoSecret$Params } from '../fn/dependabot/dependabot-get-repo-secret';
import { dependabotListAlertsForEnterprise } from '../fn/dependabot/dependabot-list-alerts-for-enterprise';
import { DependabotListAlertsForEnterprise$Params } from '../fn/dependabot/dependabot-list-alerts-for-enterprise';
import { dependabotListAlertsForOrg } from '../fn/dependabot/dependabot-list-alerts-for-org';
import { DependabotListAlertsForOrg$Params } from '../fn/dependabot/dependabot-list-alerts-for-org';
import { dependabotListAlertsForRepo } from '../fn/dependabot/dependabot-list-alerts-for-repo';
import { DependabotListAlertsForRepo$Params } from '../fn/dependabot/dependabot-list-alerts-for-repo';
import { dependabotListOrgSecrets } from '../fn/dependabot/dependabot-list-org-secrets';
import { DependabotListOrgSecrets$Params } from '../fn/dependabot/dependabot-list-org-secrets';
import { dependabotListRepoSecrets } from '../fn/dependabot/dependabot-list-repo-secrets';
import { DependabotListRepoSecrets$Params } from '../fn/dependabot/dependabot-list-repo-secrets';
import { dependabotListSelectedReposForOrgSecret } from '../fn/dependabot/dependabot-list-selected-repos-for-org-secret';
import { DependabotListSelectedReposForOrgSecret$Params } from '../fn/dependabot/dependabot-list-selected-repos-for-org-secret';
import { dependabotRemoveSelectedRepoFromOrgSecret } from '../fn/dependabot/dependabot-remove-selected-repo-from-org-secret';
import { DependabotRemoveSelectedRepoFromOrgSecret$Params } from '../fn/dependabot/dependabot-remove-selected-repo-from-org-secret';
import { dependabotSetSelectedReposForOrgSecret } from '../fn/dependabot/dependabot-set-selected-repos-for-org-secret';
import { DependabotSetSelectedReposForOrgSecret$Params } from '../fn/dependabot/dependabot-set-selected-repos-for-org-secret';
import { dependabotUpdateAlert } from '../fn/dependabot/dependabot-update-alert';
import { DependabotUpdateAlert$Params } from '../fn/dependabot/dependabot-update-alert';
import { EmptyObject } from '../models/empty-object';
import { MinimalRepository } from '../models/minimal-repository';
import { OrganizationDependabotSecret } from '../models/organization-dependabot-secret';


/**
 * Endpoints to manage Dependabot.
 */
@Injectable({ providedIn: 'root' })
export class DependabotService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `dependabotListAlertsForEnterprise()` */
  static readonly DependabotListAlertsForEnterprisePath = '/enterprises/{enterprise}/dependabot/alerts';

  /**
   * List Dependabot alerts for an enterprise.
   *
   * Lists Dependabot alerts for repositories that are owned by the specified enterprise.
   * To use this endpoint, you must be a member of the enterprise, and you must use an
   * access token with the `repo` scope or `security_events` scope.
   * Alerts are only returned for organizations in the enterprise for which you are an organization owner or a security manager. For more information about security managers, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListAlertsForEnterprise()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForEnterprise$Response(params: DependabotListAlertsForEnterprise$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DependabotAlertWithRepository>>> {
    return dependabotListAlertsForEnterprise(this.http, this.rootUrl, params, context);
  }

  /**
   * List Dependabot alerts for an enterprise.
   *
   * Lists Dependabot alerts for repositories that are owned by the specified enterprise.
   * To use this endpoint, you must be a member of the enterprise, and you must use an
   * access token with the `repo` scope or `security_events` scope.
   * Alerts are only returned for organizations in the enterprise for which you are an organization owner or a security manager. For more information about security managers, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListAlertsForEnterprise$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForEnterprise(params: DependabotListAlertsForEnterprise$Params, context?: HttpContext): Observable<Array<DependabotAlertWithRepository>> {
    return this.dependabotListAlertsForEnterprise$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DependabotAlertWithRepository>>): Array<DependabotAlertWithRepository> => r.body)
    );
  }

  /** Path part for operation `dependabotListAlertsForOrg()` */
  static readonly DependabotListAlertsForOrgPath = '/orgs/{org}/dependabot/alerts';

  /**
   * List Dependabot alerts for an organization.
   *
   * Lists Dependabot alerts for an organization.
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   *
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListAlertsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForOrg$Response(params: DependabotListAlertsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DependabotAlertWithRepository>>> {
    return dependabotListAlertsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List Dependabot alerts for an organization.
   *
   * Lists Dependabot alerts for an organization.
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   *
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListAlertsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForOrg(params: DependabotListAlertsForOrg$Params, context?: HttpContext): Observable<Array<DependabotAlertWithRepository>> {
    return this.dependabotListAlertsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DependabotAlertWithRepository>>): Array<DependabotAlertWithRepository> => r.body)
    );
  }

  /** Path part for operation `dependabotListOrgSecrets()` */
  static readonly DependabotListOrgSecretsPath = '/orgs/{org}/dependabot/secrets';

  /**
   * List organization secrets.
   *
   * Lists all secrets available in an organization without revealing their encrypted values. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListOrgSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListOrgSecrets$Response(params: DependabotListOrgSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<OrganizationDependabotSecret>;
}>> {
    return dependabotListOrgSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization secrets.
   *
   * Lists all secrets available in an organization without revealing their encrypted values. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListOrgSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListOrgSecrets(params: DependabotListOrgSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<OrganizationDependabotSecret>;
}> {
    return this.dependabotListOrgSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<OrganizationDependabotSecret>;
}>): {
'total_count': number;
'secrets': Array<OrganizationDependabotSecret>;
} => r.body)
    );
  }

  /** Path part for operation `dependabotGetOrgPublicKey()` */
  static readonly DependabotGetOrgPublicKeyPath = '/orgs/{org}/dependabot/secrets/public-key';

  /**
   * Get an organization public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotGetOrgPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetOrgPublicKey$Response(params: DependabotGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotPublicKey>> {
    return dependabotGetOrgPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotGetOrgPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetOrgPublicKey(params: DependabotGetOrgPublicKey$Params, context?: HttpContext): Observable<DependabotPublicKey> {
    return this.dependabotGetOrgPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependabotPublicKey>): DependabotPublicKey => r.body)
    );
  }

  /** Path part for operation `dependabotGetOrgSecret()` */
  static readonly DependabotGetOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}';

  /**
   * Get an organization secret.
   *
   * Gets a single organization secret without revealing its encrypted value. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotGetOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetOrgSecret$Response(params: DependabotGetOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationDependabotSecret>> {
    return dependabotGetOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization secret.
   *
   * Gets a single organization secret without revealing its encrypted value. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotGetOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetOrgSecret(params: DependabotGetOrgSecret$Params, context?: HttpContext): Observable<OrganizationDependabotSecret> {
    return this.dependabotGetOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<OrganizationDependabotSecret>): OrganizationDependabotSecret => r.body)
    );
  }

  /** Path part for operation `dependabotCreateOrUpdateOrgSecret()` */
  static readonly DependabotCreateOrUpdateOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}';

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization
   * permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotCreateOrUpdateOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotCreateOrUpdateOrgSecret$Response(params: DependabotCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return dependabotCreateOrUpdateOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization
   * permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotCreateOrUpdateOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotCreateOrUpdateOrgSecret(params: DependabotCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.dependabotCreateOrUpdateOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `dependabotDeleteOrgSecret()` */
  static readonly DependabotDeleteOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}';

  /**
   * Delete an organization secret.
   *
   * Deletes a secret in an organization using the secret name. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotDeleteOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotDeleteOrgSecret$Response(params: DependabotDeleteOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return dependabotDeleteOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization secret.
   *
   * Deletes a secret in an organization using the secret name. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotDeleteOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotDeleteOrgSecret(params: DependabotDeleteOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.dependabotDeleteOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `dependabotListSelectedReposForOrgSecret()` */
  static readonly DependabotListSelectedReposForOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}/repositories';

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility` for repository access to a secret is set to `selected`. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListSelectedReposForOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListSelectedReposForOrgSecret$Response(params: DependabotListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
    return dependabotListSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility` for repository access to a secret is set to `selected`. You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListSelectedReposForOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListSelectedReposForOrgSecret(params: DependabotListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}> {
    return this.dependabotListSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>): {
'total_count': number;
'repositories': Array<MinimalRepository>;
} => r.body)
    );
  }

  /** Path part for operation `dependabotSetSelectedReposForOrgSecret()` */
  static readonly DependabotSetSelectedReposForOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}/repositories';

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotSetSelectedReposForOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotSetSelectedReposForOrgSecret$Response(params: DependabotSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return dependabotSetSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotSetSelectedReposForOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotSetSelectedReposForOrgSecret(params: DependabotSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.dependabotSetSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `dependabotAddSelectedRepoToOrgSecret()` */
  static readonly DependabotAddSelectedRepoToOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotAddSelectedRepoToOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotAddSelectedRepoToOrgSecret$Response(params: DependabotAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return dependabotAddSelectedRepoToOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotAddSelectedRepoToOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotAddSelectedRepoToOrgSecret(params: DependabotAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.dependabotAddSelectedRepoToOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `dependabotRemoveSelectedRepoFromOrgSecret()` */
  static readonly DependabotRemoveSelectedRepoFromOrgSecretPath = '/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotRemoveSelectedRepoFromOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotRemoveSelectedRepoFromOrgSecret$Response(params: DependabotRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return dependabotRemoveSelectedRepoFromOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/dependabot/secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` organization permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotRemoveSelectedRepoFromOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotRemoveSelectedRepoFromOrgSecret(params: DependabotRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.dependabotRemoveSelectedRepoFromOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `dependabotListAlertsForRepo()` */
  static readonly DependabotListAlertsForRepoPath = '/repos/{owner}/{repo}/dependabot/alerts';

  /**
   * List Dependabot alerts for a repository.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListAlertsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForRepo$Response(params: DependabotListAlertsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<DependabotAlert>>> {
    return dependabotListAlertsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List Dependabot alerts for a repository.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListAlertsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListAlertsForRepo(params: DependabotListAlertsForRepo$Params, context?: HttpContext): Observable<Array<DependabotAlert>> {
    return this.dependabotListAlertsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<DependabotAlert>>): Array<DependabotAlert> => r.body)
    );
  }

  /** Path part for operation `dependabotGetAlert()` */
  static readonly DependabotGetAlertPath = '/repos/{owner}/{repo}/dependabot/alerts/{alert_number}';

  /**
   * Get a Dependabot alert.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotGetAlert()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetAlert$Response(params: DependabotGetAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotAlert>> {
    return dependabotGetAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a Dependabot alert.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotGetAlert$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetAlert(params: DependabotGetAlert$Params, context?: HttpContext): Observable<DependabotAlert> {
    return this.dependabotGetAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependabotAlert>): DependabotAlert => r.body)
    );
  }

  /** Path part for operation `dependabotUpdateAlert()` */
  static readonly DependabotUpdateAlertPath = '/repos/{owner}/{repo}/dependabot/alerts/{alert_number}';

  /**
   * Update a Dependabot alert.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** write permission to use this endpoint.
   *
   * To use this endpoint, you must have access to security alerts for the repository. For more information, see "[Granting access to security alerts](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository#granting-access-to-security-alerts)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotUpdateAlert()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotUpdateAlert$Response(params: DependabotUpdateAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotAlert>> {
    return dependabotUpdateAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a Dependabot alert.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repositories.
   * You can also use tokens with the `public_repo` scope for public repositories only.
   * GitHub Apps must have **Dependabot alerts** write permission to use this endpoint.
   *
   * To use this endpoint, you must have access to security alerts for the repository. For more information, see "[Granting access to security alerts](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository#granting-access-to-security-alerts)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotUpdateAlert$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotUpdateAlert(params: DependabotUpdateAlert$Params, context?: HttpContext): Observable<DependabotAlert> {
    return this.dependabotUpdateAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependabotAlert>): DependabotAlert => r.body)
    );
  }

  /** Path part for operation `dependabotListRepoSecrets()` */
  static readonly DependabotListRepoSecretsPath = '/repos/{owner}/{repo}/dependabot/secrets';

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted values. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotListRepoSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListRepoSecrets$Response(params: DependabotListRepoSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<DependabotSecret>;
}>> {
    return dependabotListRepoSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted values. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotListRepoSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotListRepoSecrets(params: DependabotListRepoSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<DependabotSecret>;
}> {
    return this.dependabotListRepoSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<DependabotSecret>;
}>): {
'total_count': number;
'secrets': Array<DependabotSecret>;
} => r.body)
    );
  }

  /** Path part for operation `dependabotGetRepoPublicKey()` */
  static readonly DependabotGetRepoPublicKeyPath = '/repos/{owner}/{repo}/dependabot/secrets/public-key';

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotGetRepoPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetRepoPublicKey$Response(params: DependabotGetRepoPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotPublicKey>> {
    return dependabotGetRepoPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotGetRepoPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetRepoPublicKey(params: DependabotGetRepoPublicKey$Params, context?: HttpContext): Observable<DependabotPublicKey> {
    return this.dependabotGetRepoPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependabotPublicKey>): DependabotPublicKey => r.body)
    );
  }

  /** Path part for operation `dependabotGetRepoSecret()` */
  static readonly DependabotGetRepoSecretPath = '/repos/{owner}/{repo}/dependabot/secrets/{secret_name}';

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotGetRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetRepoSecret$Response(params: DependabotGetRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotSecret>> {
    return dependabotGetRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotGetRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotGetRepoSecret(params: DependabotGetRepoSecret$Params, context?: HttpContext): Observable<DependabotSecret> {
    return this.dependabotGetRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<DependabotSecret>): DependabotSecret => r.body)
    );
  }

  /** Path part for operation `dependabotCreateOrUpdateRepoSecret()` */
  static readonly DependabotCreateOrUpdateRepoSecretPath = '/repos/{owner}/{repo}/dependabot/secrets/{secret_name}';

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository
   * permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotCreateOrUpdateRepoSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotCreateOrUpdateRepoSecret$Response(params: DependabotCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return dependabotCreateOrUpdateRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository
   * permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotCreateOrUpdateRepoSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  dependabotCreateOrUpdateRepoSecret(params: DependabotCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.dependabotCreateOrUpdateRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `dependabotDeleteRepoSecret()` */
  static readonly DependabotDeleteRepoSecretPath = '/repos/{owner}/{repo}/dependabot/secrets/{secret_name}';

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `dependabotDeleteRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotDeleteRepoSecret$Response(params: DependabotDeleteRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return dependabotDeleteRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have the `dependabot_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `dependabotDeleteRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  dependabotDeleteRepoSecret(params: DependabotDeleteRepoSecret$Params, context?: HttpContext): Observable<void> {
    return this.dependabotDeleteRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

}
