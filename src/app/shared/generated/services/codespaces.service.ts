/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Codespace } from '../models/codespace';
import { CodespaceExportDetails } from '../models/codespace-export-details';
import { CodespaceMachine } from '../models/codespace-machine';
import { CodespaceWithFullRepository } from '../models/codespace-with-full-repository';
import { CodespacesOrgSecret } from '../models/codespaces-org-secret';
import { CodespacesPublicKey } from '../models/codespaces-public-key';
import { CodespacesSecret } from '../models/codespaces-secret';
import { CodespacesUserPublicKey } from '../models/codespaces-user-public-key';
import { codespacesAddRepositoryForSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-add-repository-for-secret-for-authenticated-user';
import { CodespacesAddRepositoryForSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-add-repository-for-secret-for-authenticated-user';
import { codespacesAddSelectedRepoToOrgSecret } from '../fn/codespaces/codespaces-add-selected-repo-to-org-secret';
import { CodespacesAddSelectedRepoToOrgSecret$Params } from '../fn/codespaces/codespaces-add-selected-repo-to-org-secret';
import { codespacesCodespaceMachinesForAuthenticatedUser } from '../fn/codespaces/codespaces-codespace-machines-for-authenticated-user';
import { CodespacesCodespaceMachinesForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-codespace-machines-for-authenticated-user';
import { codespacesCreateForAuthenticatedUser } from '../fn/codespaces/codespaces-create-for-authenticated-user';
import { CodespacesCreateForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-create-for-authenticated-user';
import { codespacesCreateOrUpdateOrgSecret } from '../fn/codespaces/codespaces-create-or-update-org-secret';
import { CodespacesCreateOrUpdateOrgSecret$Params } from '../fn/codespaces/codespaces-create-or-update-org-secret';
import { codespacesCreateOrUpdateRepoSecret } from '../fn/codespaces/codespaces-create-or-update-repo-secret';
import { CodespacesCreateOrUpdateRepoSecret$Params } from '../fn/codespaces/codespaces-create-or-update-repo-secret';
import { codespacesCreateOrUpdateSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-create-or-update-secret-for-authenticated-user';
import { CodespacesCreateOrUpdateSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-create-or-update-secret-for-authenticated-user';
import { codespacesCreateWithPrForAuthenticatedUser } from '../fn/codespaces/codespaces-create-with-pr-for-authenticated-user';
import { CodespacesCreateWithPrForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-create-with-pr-for-authenticated-user';
import { codespacesCreateWithRepoForAuthenticatedUser } from '../fn/codespaces/codespaces-create-with-repo-for-authenticated-user';
import { CodespacesCreateWithRepoForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-create-with-repo-for-authenticated-user';
import { codespacesDeleteCodespacesAccessUsers } from '../fn/codespaces/codespaces-delete-codespaces-access-users';
import { CodespacesDeleteCodespacesAccessUsers$Params } from '../fn/codespaces/codespaces-delete-codespaces-access-users';
import { codespacesDeleteForAuthenticatedUser } from '../fn/codespaces/codespaces-delete-for-authenticated-user';
import { CodespacesDeleteForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-delete-for-authenticated-user';
import { codespacesDeleteFromOrganization } from '../fn/codespaces/codespaces-delete-from-organization';
import { CodespacesDeleteFromOrganization$Params } from '../fn/codespaces/codespaces-delete-from-organization';
import { codespacesDeleteOrgSecret } from '../fn/codespaces/codespaces-delete-org-secret';
import { CodespacesDeleteOrgSecret$Params } from '../fn/codespaces/codespaces-delete-org-secret';
import { codespacesDeleteRepoSecret } from '../fn/codespaces/codespaces-delete-repo-secret';
import { CodespacesDeleteRepoSecret$Params } from '../fn/codespaces/codespaces-delete-repo-secret';
import { codespacesDeleteSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-delete-secret-for-authenticated-user';
import { CodespacesDeleteSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-delete-secret-for-authenticated-user';
import { codespacesExportForAuthenticatedUser } from '../fn/codespaces/codespaces-export-for-authenticated-user';
import { CodespacesExportForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-export-for-authenticated-user';
import { codespacesGetCodespacesForUserInOrg } from '../fn/codespaces/codespaces-get-codespaces-for-user-in-org';
import { CodespacesGetCodespacesForUserInOrg$Params } from '../fn/codespaces/codespaces-get-codespaces-for-user-in-org';
import { codespacesGetExportDetailsForAuthenticatedUser } from '../fn/codespaces/codespaces-get-export-details-for-authenticated-user';
import { CodespacesGetExportDetailsForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-get-export-details-for-authenticated-user';
import { codespacesGetForAuthenticatedUser } from '../fn/codespaces/codespaces-get-for-authenticated-user';
import { CodespacesGetForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-get-for-authenticated-user';
import { codespacesGetOrgPublicKey } from '../fn/codespaces/codespaces-get-org-public-key';
import { CodespacesGetOrgPublicKey$Params } from '../fn/codespaces/codespaces-get-org-public-key';
import { codespacesGetOrgSecret } from '../fn/codespaces/codespaces-get-org-secret';
import { CodespacesGetOrgSecret$Params } from '../fn/codespaces/codespaces-get-org-secret';
import { codespacesGetPublicKeyForAuthenticatedUser } from '../fn/codespaces/codespaces-get-public-key-for-authenticated-user';
import { CodespacesGetPublicKeyForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-get-public-key-for-authenticated-user';
import { codespacesGetRepoPublicKey } from '../fn/codespaces/codespaces-get-repo-public-key';
import { CodespacesGetRepoPublicKey$Params } from '../fn/codespaces/codespaces-get-repo-public-key';
import { codespacesGetRepoSecret } from '../fn/codespaces/codespaces-get-repo-secret';
import { CodespacesGetRepoSecret$Params } from '../fn/codespaces/codespaces-get-repo-secret';
import { codespacesGetSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-get-secret-for-authenticated-user';
import { CodespacesGetSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-get-secret-for-authenticated-user';
import { codespacesListDevcontainersInRepositoryForAuthenticatedUser } from '../fn/codespaces/codespaces-list-devcontainers-in-repository-for-authenticated-user';
import { CodespacesListDevcontainersInRepositoryForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-list-devcontainers-in-repository-for-authenticated-user';
import { codespacesListForAuthenticatedUser } from '../fn/codespaces/codespaces-list-for-authenticated-user';
import { CodespacesListForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-list-for-authenticated-user';
import { codespacesListInOrganization } from '../fn/codespaces/codespaces-list-in-organization';
import { CodespacesListInOrganization$Params } from '../fn/codespaces/codespaces-list-in-organization';
import { codespacesListInRepositoryForAuthenticatedUser } from '../fn/codespaces/codespaces-list-in-repository-for-authenticated-user';
import { CodespacesListInRepositoryForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-list-in-repository-for-authenticated-user';
import { codespacesListOrgSecrets } from '../fn/codespaces/codespaces-list-org-secrets';
import { CodespacesListOrgSecrets$Params } from '../fn/codespaces/codespaces-list-org-secrets';
import { codespacesListRepoSecrets } from '../fn/codespaces/codespaces-list-repo-secrets';
import { CodespacesListRepoSecrets$Params } from '../fn/codespaces/codespaces-list-repo-secrets';
import { codespacesListRepositoriesForSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-list-repositories-for-secret-for-authenticated-user';
import { CodespacesListRepositoriesForSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-list-repositories-for-secret-for-authenticated-user';
import { codespacesListSecretsForAuthenticatedUser } from '../fn/codespaces/codespaces-list-secrets-for-authenticated-user';
import { CodespacesListSecretsForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-list-secrets-for-authenticated-user';
import { codespacesListSelectedReposForOrgSecret } from '../fn/codespaces/codespaces-list-selected-repos-for-org-secret';
import { CodespacesListSelectedReposForOrgSecret$Params } from '../fn/codespaces/codespaces-list-selected-repos-for-org-secret';
import { codespacesPreFlightWithRepoForAuthenticatedUser } from '../fn/codespaces/codespaces-pre-flight-with-repo-for-authenticated-user';
import { CodespacesPreFlightWithRepoForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-pre-flight-with-repo-for-authenticated-user';
import { codespacesPublishForAuthenticatedUser } from '../fn/codespaces/codespaces-publish-for-authenticated-user';
import { CodespacesPublishForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-publish-for-authenticated-user';
import { codespacesRemoveRepositoryForSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-remove-repository-for-secret-for-authenticated-user';
import { CodespacesRemoveRepositoryForSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-remove-repository-for-secret-for-authenticated-user';
import { codespacesRemoveSelectedRepoFromOrgSecret } from '../fn/codespaces/codespaces-remove-selected-repo-from-org-secret';
import { CodespacesRemoveSelectedRepoFromOrgSecret$Params } from '../fn/codespaces/codespaces-remove-selected-repo-from-org-secret';
import { codespacesRepoMachinesForAuthenticatedUser } from '../fn/codespaces/codespaces-repo-machines-for-authenticated-user';
import { CodespacesRepoMachinesForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-repo-machines-for-authenticated-user';
import { codespacesSetCodespacesAccess } from '../fn/codespaces/codespaces-set-codespaces-access';
import { CodespacesSetCodespacesAccess$Params } from '../fn/codespaces/codespaces-set-codespaces-access';
import { codespacesSetCodespacesAccessUsers } from '../fn/codespaces/codespaces-set-codespaces-access-users';
import { CodespacesSetCodespacesAccessUsers$Params } from '../fn/codespaces/codespaces-set-codespaces-access-users';
import { codespacesSetRepositoriesForSecretForAuthenticatedUser } from '../fn/codespaces/codespaces-set-repositories-for-secret-for-authenticated-user';
import { CodespacesSetRepositoriesForSecretForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-set-repositories-for-secret-for-authenticated-user';
import { codespacesSetSelectedReposForOrgSecret } from '../fn/codespaces/codespaces-set-selected-repos-for-org-secret';
import { CodespacesSetSelectedReposForOrgSecret$Params } from '../fn/codespaces/codespaces-set-selected-repos-for-org-secret';
import { codespacesStartForAuthenticatedUser } from '../fn/codespaces/codespaces-start-for-authenticated-user';
import { CodespacesStartForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-start-for-authenticated-user';
import { codespacesStopForAuthenticatedUser } from '../fn/codespaces/codespaces-stop-for-authenticated-user';
import { CodespacesStopForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-stop-for-authenticated-user';
import { codespacesStopInOrganization } from '../fn/codespaces/codespaces-stop-in-organization';
import { CodespacesStopInOrganization$Params } from '../fn/codespaces/codespaces-stop-in-organization';
import { codespacesUpdateForAuthenticatedUser } from '../fn/codespaces/codespaces-update-for-authenticated-user';
import { CodespacesUpdateForAuthenticatedUser$Params } from '../fn/codespaces/codespaces-update-for-authenticated-user';
import { EmptyObject } from '../models/empty-object';
import { MinimalRepository } from '../models/minimal-repository';
import { RepoCodespacesSecret } from '../models/repo-codespaces-secret';
import { SimpleUser } from '../models/simple-user';


/**
 * Endpoints to manage Codespaces using the REST API.
 */
@Injectable({ providedIn: 'root' })
export class CodespacesService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `codespacesListInOrganization()` */
  static readonly CodespacesListInOrganizationPath = '/orgs/{org}/codespaces';

  /**
   * List codespaces for the organization.
   *
   * Lists the codespaces associated to a specified organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListInOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListInOrganization$Response(params: CodespacesListInOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
    return codespacesListInOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * List codespaces for the organization.
   *
   * Lists the codespaces associated to a specified organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListInOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListInOrganization(params: CodespacesListInOrganization$Params, context?: HttpContext): Observable<{
'total_count': number;
'codespaces': Array<Codespace>;
}> {
    return this.codespacesListInOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>): {
'total_count': number;
'codespaces': Array<Codespace>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesSetCodespacesAccess()` */
  static readonly CodespacesSetCodespacesAccessPath = '/orgs/{org}/codespaces/access';

  /**
   * Manage access control for organization codespaces.
   *
   * Sets which users can access codespaces in an organization. This is synonymous with granting or revoking codespaces access permissions for users according to the visibility.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesSetCodespacesAccess()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesSetCodespacesAccess$Response(params: CodespacesSetCodespacesAccess$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesSetCodespacesAccess(this.http, this.rootUrl, params, context);
  }

  /**
   * Manage access control for organization codespaces.
   *
   * Sets which users can access codespaces in an organization. This is synonymous with granting or revoking codespaces access permissions for users according to the visibility.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesSetCodespacesAccess$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesSetCodespacesAccess(params: CodespacesSetCodespacesAccess$Params, context?: HttpContext): Observable<void> {
    return this.codespacesSetCodespacesAccess$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesSetCodespacesAccessUsers()` */
  static readonly CodespacesSetCodespacesAccessUsersPath = '/orgs/{org}/codespaces/access/selected_users';

  /**
   * Add users to Codespaces access for an organization.
   *
   * Codespaces for the specified users will be billed to the organization.
   *
   * To use this endpoint, the access settings for the organization must be set to `selected_members`.
   * For information on how to change this setting, see "[Manage access control for organization codespaces](https://docs.github.com/rest/codespaces/organizations#manage-access-control-for-organization-codespaces)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesSetCodespacesAccessUsers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesSetCodespacesAccessUsers$Response(params: CodespacesSetCodespacesAccessUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesSetCodespacesAccessUsers(this.http, this.rootUrl, params, context);
  }

  /**
   * Add users to Codespaces access for an organization.
   *
   * Codespaces for the specified users will be billed to the organization.
   *
   * To use this endpoint, the access settings for the organization must be set to `selected_members`.
   * For information on how to change this setting, see "[Manage access control for organization codespaces](https://docs.github.com/rest/codespaces/organizations#manage-access-control-for-organization-codespaces)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesSetCodespacesAccessUsers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesSetCodespacesAccessUsers(params: CodespacesSetCodespacesAccessUsers$Params, context?: HttpContext): Observable<void> {
    return this.codespacesSetCodespacesAccessUsers$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteCodespacesAccessUsers()` */
  static readonly CodespacesDeleteCodespacesAccessUsersPath = '/orgs/{org}/codespaces/access/selected_users';

  /**
   * Remove users from Codespaces access for an organization.
   *
   * Codespaces for the specified users will no longer be billed to the organization.
   *
   * To use this endpoint, the access settings for the organization must be set to `selected_members`.
   * For information on how to change this setting, see "[Manage access control for organization codespaces](https://docs.github.com/rest/codespaces/organizations#manage-access-control-for-organization-codespaces)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteCodespacesAccessUsers()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesDeleteCodespacesAccessUsers$Response(params: CodespacesDeleteCodespacesAccessUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesDeleteCodespacesAccessUsers(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove users from Codespaces access for an organization.
   *
   * Codespaces for the specified users will no longer be billed to the organization.
   *
   * To use this endpoint, the access settings for the organization must be set to `selected_members`.
   * For information on how to change this setting, see "[Manage access control for organization codespaces](https://docs.github.com/rest/codespaces/organizations#manage-access-control-for-organization-codespaces)."
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteCodespacesAccessUsers$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   *
   * @deprecated
   */
  codespacesDeleteCodespacesAccessUsers(params: CodespacesDeleteCodespacesAccessUsers$Params, context?: HttpContext): Observable<void> {
    return this.codespacesDeleteCodespacesAccessUsers$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesListOrgSecrets()` */
  static readonly CodespacesListOrgSecretsPath = '/orgs/{org}/codespaces/secrets';

  /**
   * List organization secrets.
   *
   * Lists all Codespaces secrets available at the organization-level without revealing their encrypted values.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListOrgSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListOrgSecrets$Response(params: CodespacesListOrgSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<CodespacesOrgSecret>;
}>> {
    return codespacesListOrgSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List organization secrets.
   *
   * Lists all Codespaces secrets available at the organization-level without revealing their encrypted values.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListOrgSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListOrgSecrets(params: CodespacesListOrgSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<CodespacesOrgSecret>;
}> {
    return this.codespacesListOrgSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<CodespacesOrgSecret>;
}>): {
'total_count': number;
'secrets': Array<CodespacesOrgSecret>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesGetOrgPublicKey()` */
  static readonly CodespacesGetOrgPublicKeyPath = '/orgs/{org}/codespaces/secrets/public-key';

  /**
   * Get an organization public key.
   *
   * Gets a public key for an organization, which is required in order to encrypt secrets. You need to encrypt the value of a secret before you can create or update secrets. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetOrgPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetOrgPublicKey$Response(params: CodespacesGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesPublicKey>> {
    return codespacesGetOrgPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization public key.
   *
   * Gets a public key for an organization, which is required in order to encrypt secrets. You need to encrypt the value of a secret before you can create or update secrets. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetOrgPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetOrgPublicKey(params: CodespacesGetOrgPublicKey$Params, context?: HttpContext): Observable<CodespacesPublicKey> {
    return this.codespacesGetOrgPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespacesPublicKey>): CodespacesPublicKey => r.body)
    );
  }

  /** Path part for operation `codespacesGetOrgSecret()` */
  static readonly CodespacesGetOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}';

  /**
   * Get an organization secret.
   *
   * Gets an organization secret without revealing its encrypted value.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetOrgSecret$Response(params: CodespacesGetOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesOrgSecret>> {
    return codespacesGetOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an organization secret.
   *
   * Gets an organization secret without revealing its encrypted value.
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetOrgSecret(params: CodespacesGetOrgSecret$Params, context?: HttpContext): Observable<CodespacesOrgSecret> {
    return this.codespacesGetOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespacesOrgSecret>): CodespacesOrgSecret => r.body)
    );
  }

  /** Path part for operation `codespacesCreateOrUpdateOrgSecret()` */
  static readonly CodespacesCreateOrUpdateOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}';

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateOrUpdateOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateOrgSecret$Response(params: CodespacesCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return codespacesCreateOrUpdateOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update an organization secret.
   *
   * Creates or updates an organization secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateOrUpdateOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateOrgSecret(params: CodespacesCreateOrUpdateOrgSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.codespacesCreateOrUpdateOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteOrgSecret()` */
  static readonly CodespacesDeleteOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}';

  /**
   * Delete an organization secret.
   *
   * Deletes an organization secret using the secret name. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteOrgSecret$Response(params: CodespacesDeleteOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesDeleteOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete an organization secret.
   *
   * Deletes an organization secret using the secret name. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteOrgSecret(params: CodespacesDeleteOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.codespacesDeleteOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesListSelectedReposForOrgSecret()` */
  static readonly CodespacesListSelectedReposForOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}/repositories';

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility` for repository access to a secret is set to `selected`. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListSelectedReposForOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListSelectedReposForOrgSecret$Response(params: CodespacesListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
    return codespacesListSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories for an organization secret.
   *
   * Lists all repositories that have been selected when the `visibility` for repository access to a secret is set to `selected`. You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListSelectedReposForOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListSelectedReposForOrgSecret(params: CodespacesListSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}> {
    return this.codespacesListSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>): {
'total_count': number;
'repositories': Array<MinimalRepository>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesSetSelectedReposForOrgSecret()` */
  static readonly CodespacesSetSelectedReposForOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}/repositories';

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesSetSelectedReposForOrgSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesSetSelectedReposForOrgSecret$Response(params: CodespacesSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesSetSelectedReposForOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories for an organization secret.
   *
   * Replaces all repositories for an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesSetSelectedReposForOrgSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesSetSelectedReposForOrgSecret(params: CodespacesSetSelectedReposForOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.codespacesSetSelectedReposForOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesAddSelectedRepoToOrgSecret()` */
  static readonly CodespacesAddSelectedRepoToOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesAddSelectedRepoToOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesAddSelectedRepoToOrgSecret$Response(params: CodespacesAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesAddSelectedRepoToOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Add selected repository to an organization secret.
   *
   * Adds a repository to an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesAddSelectedRepoToOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesAddSelectedRepoToOrgSecret(params: CodespacesAddSelectedRepoToOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.codespacesAddSelectedRepoToOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesRemoveSelectedRepoFromOrgSecret()` */
  static readonly CodespacesRemoveSelectedRepoFromOrgSecretPath = '/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesRemoveSelectedRepoFromOrgSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRemoveSelectedRepoFromOrgSecret$Response(params: CodespacesRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesRemoveSelectedRepoFromOrgSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove selected repository from an organization secret.
   *
   * Removes a repository from an organization secret when the `visibility` for repository access is set to `selected`. The visibility is set when you [Create or update an organization secret](https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret). You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesRemoveSelectedRepoFromOrgSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRemoveSelectedRepoFromOrgSecret(params: CodespacesRemoveSelectedRepoFromOrgSecret$Params, context?: HttpContext): Observable<void> {
    return this.codespacesRemoveSelectedRepoFromOrgSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesGetCodespacesForUserInOrg()` */
  static readonly CodespacesGetCodespacesForUserInOrgPath = '/orgs/{org}/members/{username}/codespaces';

  /**
   * List codespaces for a user in organization.
   *
   * Lists the codespaces that a member of an organization has for repositories in that organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetCodespacesForUserInOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetCodespacesForUserInOrg$Response(params: CodespacesGetCodespacesForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
    return codespacesGetCodespacesForUserInOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List codespaces for a user in organization.
   *
   * Lists the codespaces that a member of an organization has for repositories in that organization.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetCodespacesForUserInOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetCodespacesForUserInOrg(params: CodespacesGetCodespacesForUserInOrg$Params, context?: HttpContext): Observable<{
'total_count': number;
'codespaces': Array<Codespace>;
}> {
    return this.codespacesGetCodespacesForUserInOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>): {
'total_count': number;
'codespaces': Array<Codespace>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteFromOrganization()` */
  static readonly CodespacesDeleteFromOrganizationPath = '/orgs/{org}/members/{username}/codespaces/{codespace_name}';

  /**
   * Delete a codespace from the organization.
   *
   * Deletes a user's codespace.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteFromOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteFromOrganization$Response(params: CodespacesDeleteFromOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return codespacesDeleteFromOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a codespace from the organization.
   *
   * Deletes a user's codespace.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteFromOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteFromOrganization(params: CodespacesDeleteFromOrganization$Params, context?: HttpContext): Observable<{
}> {
    return this.codespacesDeleteFromOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `codespacesStopInOrganization()` */
  static readonly CodespacesStopInOrganizationPath = '/orgs/{org}/members/{username}/codespaces/{codespace_name}/stop';

  /**
   * Stop a codespace for an organization user.
   *
   * Stops a user's codespace.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesStopInOrganization()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStopInOrganization$Response(params: CodespacesStopInOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesStopInOrganization(this.http, this.rootUrl, params, context);
  }

  /**
   * Stop a codespace for an organization user.
   *
   * Stops a user's codespace.
   *
   * You must authenticate using an access token with the `admin:org` scope to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesStopInOrganization$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStopInOrganization(params: CodespacesStopInOrganization$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesStopInOrganization$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesListInRepositoryForAuthenticatedUser()` */
  static readonly CodespacesListInRepositoryForAuthenticatedUserPath = '/repos/{owner}/{repo}/codespaces';

  /**
   * List codespaces in a repository for the authenticated user.
   *
   * Lists the codespaces associated to a specified repository and the authenticated user.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListInRepositoryForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListInRepositoryForAuthenticatedUser$Response(params: CodespacesListInRepositoryForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
    return codespacesListInRepositoryForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List codespaces in a repository for the authenticated user.
   *
   * Lists the codespaces associated to a specified repository and the authenticated user.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListInRepositoryForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListInRepositoryForAuthenticatedUser(params: CodespacesListInRepositoryForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'codespaces': Array<Codespace>;
}> {
    return this.codespacesListInRepositoryForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>): {
'total_count': number;
'codespaces': Array<Codespace>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesCreateWithRepoForAuthenticatedUser()` */
  static readonly CodespacesCreateWithRepoForAuthenticatedUserPath = '/repos/{owner}/{repo}/codespaces';

  /**
   * Create a codespace in a repository.
   *
   * Creates a codespace owned by the authenticated user in the specified repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateWithRepoForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateWithRepoForAuthenticatedUser$Response(params: CodespacesCreateWithRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesCreateWithRepoForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a codespace in a repository.
   *
   * Creates a codespace owned by the authenticated user in the specified repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateWithRepoForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateWithRepoForAuthenticatedUser(params: CodespacesCreateWithRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesCreateWithRepoForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesListDevcontainersInRepositoryForAuthenticatedUser()` */
  static readonly CodespacesListDevcontainersInRepositoryForAuthenticatedUserPath = '/repos/{owner}/{repo}/codespaces/devcontainers';

  /**
   * List devcontainer configurations in a repository for the authenticated user.
   *
   * Lists the devcontainer.json files associated with a specified repository and the authenticated user. These files
   * specify launchpoint configurations for codespaces created within the repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListDevcontainersInRepositoryForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListDevcontainersInRepositoryForAuthenticatedUser$Response(params: CodespacesListDevcontainersInRepositoryForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'devcontainers': Array<{
'path': string;
'name'?: string;
'display_name'?: string;
}>;
}>> {
    return codespacesListDevcontainersInRepositoryForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List devcontainer configurations in a repository for the authenticated user.
   *
   * Lists the devcontainer.json files associated with a specified repository and the authenticated user. These files
   * specify launchpoint configurations for codespaces created within the repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListDevcontainersInRepositoryForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListDevcontainersInRepositoryForAuthenticatedUser(params: CodespacesListDevcontainersInRepositoryForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'devcontainers': Array<{
'path': string;
'name'?: string;
'display_name'?: string;
}>;
}> {
    return this.codespacesListDevcontainersInRepositoryForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'devcontainers': Array<{
'path': string;
'name'?: string;
'display_name'?: string;
}>;
}>): {
'total_count': number;
'devcontainers': Array<{
'path': string;
'name'?: string;
'display_name'?: string;
}>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesRepoMachinesForAuthenticatedUser()` */
  static readonly CodespacesRepoMachinesForAuthenticatedUserPath = '/repos/{owner}/{repo}/codespaces/machines';

  /**
   * List available machine types for a repository.
   *
   * List the machine types available for a given repository based on its configuration.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesRepoMachinesForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRepoMachinesForAuthenticatedUser$Response(params: CodespacesRepoMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>> {
    return codespacesRepoMachinesForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List available machine types for a repository.
   *
   * List the machine types available for a given repository based on its configuration.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesRepoMachinesForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRepoMachinesForAuthenticatedUser(params: CodespacesRepoMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}> {
    return this.codespacesRepoMachinesForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>): {
'total_count': number;
'machines': Array<CodespaceMachine>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesPreFlightWithRepoForAuthenticatedUser()` */
  static readonly CodespacesPreFlightWithRepoForAuthenticatedUserPath = '/repos/{owner}/{repo}/codespaces/new';

  /**
   * Get default attributes for a codespace.
   *
   * Gets the default attributes for codespaces created by the user with the repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesPreFlightWithRepoForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesPreFlightWithRepoForAuthenticatedUser$Response(params: CodespacesPreFlightWithRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'billable_owner'?: SimpleUser;
'defaults'?: {
'location': string;
'devcontainer_path': string | null;
};
}>> {
    return codespacesPreFlightWithRepoForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get default attributes for a codespace.
   *
   * Gets the default attributes for codespaces created by the user with the repository.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesPreFlightWithRepoForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesPreFlightWithRepoForAuthenticatedUser(params: CodespacesPreFlightWithRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'billable_owner'?: SimpleUser;
'defaults'?: {
'location': string;
'devcontainer_path': string | null;
};
}> {
    return this.codespacesPreFlightWithRepoForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'billable_owner'?: SimpleUser;
'defaults'?: {
'location': string;
'devcontainer_path': string | null;
};
}>): {
'billable_owner'?: SimpleUser;
'defaults'?: {
'location': string;
'devcontainer_path': string | null;
};
} => r.body)
    );
  }

  /** Path part for operation `codespacesListRepoSecrets()` */
  static readonly CodespacesListRepoSecretsPath = '/repos/{owner}/{repo}/codespaces/secrets';

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted values. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListRepoSecrets()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListRepoSecrets$Response(params: CodespacesListRepoSecrets$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<RepoCodespacesSecret>;
}>> {
    return codespacesListRepoSecrets(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository secrets.
   *
   * Lists all secrets available in a repository without revealing their encrypted values. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListRepoSecrets$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListRepoSecrets(params: CodespacesListRepoSecrets$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<RepoCodespacesSecret>;
}> {
    return this.codespacesListRepoSecrets$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<RepoCodespacesSecret>;
}>): {
'total_count': number;
'secrets': Array<RepoCodespacesSecret>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesGetRepoPublicKey()` */
  static readonly CodespacesGetRepoPublicKeyPath = '/repos/{owner}/{repo}/codespaces/secrets/public-key';

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetRepoPublicKey()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetRepoPublicKey$Response(params: CodespacesGetRepoPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesPublicKey>> {
    return codespacesGetRepoPublicKey(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository public key.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets. Anyone with read access to the repository can use this endpoint. If the repository is private you must use an access token with the `repo` scope. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetRepoPublicKey$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetRepoPublicKey(params: CodespacesGetRepoPublicKey$Params, context?: HttpContext): Observable<CodespacesPublicKey> {
    return this.codespacesGetRepoPublicKey$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespacesPublicKey>): CodespacesPublicKey => r.body)
    );
  }

  /** Path part for operation `codespacesGetRepoSecret()` */
  static readonly CodespacesGetRepoSecretPath = '/repos/{owner}/{repo}/codespaces/secrets/{secret_name}';

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetRepoSecret$Response(params: CodespacesGetRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<RepoCodespacesSecret>> {
    return codespacesGetRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository secret.
   *
   * Gets a single repository secret without revealing its encrypted value. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetRepoSecret(params: CodespacesGetRepoSecret$Params, context?: HttpContext): Observable<RepoCodespacesSecret> {
    return this.codespacesGetRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepoCodespacesSecret>): RepoCodespacesSecret => r.body)
    );
  }

  /** Path part for operation `codespacesCreateOrUpdateRepoSecret()` */
  static readonly CodespacesCreateOrUpdateRepoSecretPath = '/repos/{owner}/{repo}/codespaces/secrets/{secret_name}';

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets`
   * repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateOrUpdateRepoSecret()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateRepoSecret$Response(params: CodespacesCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return codespacesCreateOrUpdateRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update a repository secret.
   *
   * Creates or updates a repository secret with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access
   * token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets`
   * repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateOrUpdateRepoSecret$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateRepoSecret(params: CodespacesCreateOrUpdateRepoSecret$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.codespacesCreateOrUpdateRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteRepoSecret()` */
  static readonly CodespacesDeleteRepoSecretPath = '/repos/{owner}/{repo}/codespaces/secrets/{secret_name}';

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteRepoSecret()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteRepoSecret$Response(params: CodespacesDeleteRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesDeleteRepoSecret(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a repository secret.
   *
   * Deletes a secret in a repository using the secret name. You must authenticate using an access token with the `repo` scope to use this endpoint. GitHub Apps must have write access to the `codespaces_secrets` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteRepoSecret$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteRepoSecret(params: CodespacesDeleteRepoSecret$Params, context?: HttpContext): Observable<void> {
    return this.codespacesDeleteRepoSecret$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesCreateWithPrForAuthenticatedUser()` */
  static readonly CodespacesCreateWithPrForAuthenticatedUserPath = '/repos/{owner}/{repo}/pulls/{pull_number}/codespaces';

  /**
   * Create a codespace from a pull request.
   *
   * Creates a codespace owned by the authenticated user for the specified pull request.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateWithPrForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateWithPrForAuthenticatedUser$Response(params: CodespacesCreateWithPrForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesCreateWithPrForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a codespace from a pull request.
   *
   * Creates a codespace owned by the authenticated user for the specified pull request.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateWithPrForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateWithPrForAuthenticatedUser(params: CodespacesCreateWithPrForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesCreateWithPrForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesListForAuthenticatedUser()` */
  static readonly CodespacesListForAuthenticatedUserPath = '/user/codespaces';

  /**
   * List codespaces for the authenticated user.
   *
   * Lists the authenticated user's codespaces.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListForAuthenticatedUser$Response(params?: CodespacesListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
    return codespacesListForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List codespaces for the authenticated user.
   *
   * Lists the authenticated user's codespaces.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListForAuthenticatedUser(params?: CodespacesListForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'codespaces': Array<Codespace>;
}> {
    return this.codespacesListForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>): {
'total_count': number;
'codespaces': Array<Codespace>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesCreateForAuthenticatedUser()` */
  static readonly CodespacesCreateForAuthenticatedUserPath = '/user/codespaces';

  /**
   * Create a codespace for the authenticated user.
   *
   * Creates a new codespace, owned by the authenticated user.
   *
   * This endpoint requires either a `repository_id` OR a `pull_request` but not both.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateForAuthenticatedUser$Response(params: CodespacesCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesCreateForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a codespace for the authenticated user.
   *
   * Creates a new codespace, owned by the authenticated user.
   *
   * This endpoint requires either a `repository_id` OR a `pull_request` but not both.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateForAuthenticatedUser(params: CodespacesCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesCreateForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesListSecretsForAuthenticatedUser()` */
  static readonly CodespacesListSecretsForAuthenticatedUserPath = '/user/codespaces/secrets';

  /**
   * List secrets for the authenticated user.
   *
   * Lists all secrets available for a user's Codespaces without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListSecretsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListSecretsForAuthenticatedUser$Response(params?: CodespacesListSecretsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<CodespacesSecret>;
}>> {
    return codespacesListSecretsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List secrets for the authenticated user.
   *
   * Lists all secrets available for a user's Codespaces without revealing their
   * encrypted values.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListSecretsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListSecretsForAuthenticatedUser(params?: CodespacesListSecretsForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'secrets': Array<CodespacesSecret>;
}> {
    return this.codespacesListSecretsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'secrets': Array<CodespacesSecret>;
}>): {
'total_count': number;
'secrets': Array<CodespacesSecret>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesGetPublicKeyForAuthenticatedUser()` */
  static readonly CodespacesGetPublicKeyForAuthenticatedUserPath = '/user/codespaces/secrets/public-key';

  /**
   * Get public key for the authenticated user.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetPublicKeyForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetPublicKeyForAuthenticatedUser$Response(params?: CodespacesGetPublicKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesUserPublicKey>> {
    return codespacesGetPublicKeyForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get public key for the authenticated user.
   *
   * Gets your public key, which you need to encrypt secrets. You need to encrypt a secret before you can create or update secrets.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetPublicKeyForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetPublicKeyForAuthenticatedUser(params?: CodespacesGetPublicKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<CodespacesUserPublicKey> {
    return this.codespacesGetPublicKeyForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespacesUserPublicKey>): CodespacesUserPublicKey => r.body)
    );
  }

  /** Path part for operation `codespacesGetSecretForAuthenticatedUser()` */
  static readonly CodespacesGetSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}';

  /**
   * Get a secret for the authenticated user.
   *
   * Gets a secret available to a user's codespaces without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetSecretForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetSecretForAuthenticatedUser$Response(params: CodespacesGetSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesSecret>> {
    return codespacesGetSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a secret for the authenticated user.
   *
   * Gets a secret available to a user's codespaces without revealing its encrypted value.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetSecretForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetSecretForAuthenticatedUser(params: CodespacesGetSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<CodespacesSecret> {
    return this.codespacesGetSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespacesSecret>): CodespacesSecret => r.body)
    );
  }

  /** Path part for operation `codespacesCreateOrUpdateSecretForAuthenticatedUser()` */
  static readonly CodespacesCreateOrUpdateSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}';

  /**
   * Create or update a secret for the authenticated user.
   *
   * Creates or updates a secret for a user's codespace with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must also have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCreateOrUpdateSecretForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateSecretForAuthenticatedUser$Response(params: CodespacesCreateOrUpdateSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return codespacesCreateOrUpdateSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create or update a secret for the authenticated user.
   *
   * Creates or updates a secret for a user's codespace with an encrypted value. Encrypt your secret using
   * [LibSodium](https://libsodium.gitbook.io/doc/bindings_for_other_languages). For more information, see "[Encrypting secrets for the REST API](https://docs.github.com/rest/guides/encrypting-secrets-for-the-rest-api)."
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must also have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCreateOrUpdateSecretForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesCreateOrUpdateSecretForAuthenticatedUser(params: CodespacesCreateOrUpdateSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.codespacesCreateOrUpdateSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteSecretForAuthenticatedUser()` */
  static readonly CodespacesDeleteSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}';

  /**
   * Delete a secret for the authenticated user.
   *
   * Deletes a secret from a user's codespaces using the secret name. Deleting the secret will remove access from all codespaces that were allowed to access the secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteSecretForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteSecretForAuthenticatedUser$Response(params: CodespacesDeleteSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesDeleteSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a secret for the authenticated user.
   *
   * Deletes a secret from a user's codespaces using the secret name. Deleting the secret will remove access from all codespaces that were allowed to access the secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteSecretForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteSecretForAuthenticatedUser(params: CodespacesDeleteSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.codespacesDeleteSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesListRepositoriesForSecretForAuthenticatedUser()` */
  static readonly CodespacesListRepositoriesForSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}/repositories';

  /**
   * List selected repositories for a user secret.
   *
   * List the repositories that have been granted the ability to use a user's codespace secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesListRepositoriesForSecretForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListRepositoriesForSecretForAuthenticatedUser$Response(params: CodespacesListRepositoriesForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
    return codespacesListRepositoriesForSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List selected repositories for a user secret.
   *
   * List the repositories that have been granted the ability to use a user's codespace secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesListRepositoriesForSecretForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesListRepositoriesForSecretForAuthenticatedUser(params: CodespacesListRepositoriesForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}> {
    return this.codespacesListRepositoriesForSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>): {
'total_count': number;
'repositories': Array<MinimalRepository>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesSetRepositoriesForSecretForAuthenticatedUser()` */
  static readonly CodespacesSetRepositoriesForSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}/repositories';

  /**
   * Set selected repositories for a user secret.
   *
   * Select the repositories that will use a user's codespace secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesSetRepositoriesForSecretForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesSetRepositoriesForSecretForAuthenticatedUser$Response(params: CodespacesSetRepositoriesForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesSetRepositoriesForSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Set selected repositories for a user secret.
   *
   * Select the repositories that will use a user's codespace secret.
   *
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on all referenced repositories to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesSetRepositoriesForSecretForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesSetRepositoriesForSecretForAuthenticatedUser(params: CodespacesSetRepositoriesForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.codespacesSetRepositoriesForSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesAddRepositoryForSecretForAuthenticatedUser()` */
  static readonly CodespacesAddRepositoryForSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Add a selected repository to a user secret.
   *
   * Adds a repository to the selected repositories for a user's codespace secret.
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on the referenced repository to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesAddRepositoryForSecretForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesAddRepositoryForSecretForAuthenticatedUser$Response(params: CodespacesAddRepositoryForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesAddRepositoryForSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Add a selected repository to a user secret.
   *
   * Adds a repository to the selected repositories for a user's codespace secret.
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission and write access to the `codespaces_secrets` repository permission on the referenced repository to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesAddRepositoryForSecretForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesAddRepositoryForSecretForAuthenticatedUser(params: CodespacesAddRepositoryForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.codespacesAddRepositoryForSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesRemoveRepositoryForSecretForAuthenticatedUser()` */
  static readonly CodespacesRemoveRepositoryForSecretForAuthenticatedUserPath = '/user/codespaces/secrets/{secret_name}/repositories/{repository_id}';

  /**
   * Remove a selected repository from a user secret.
   *
   * Removes a repository from the selected repositories for a user's codespace secret.
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesRemoveRepositoryForSecretForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRemoveRepositoryForSecretForAuthenticatedUser$Response(params: CodespacesRemoveRepositoryForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return codespacesRemoveRepositoryForSecretForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Remove a selected repository from a user secret.
   *
   * Removes a repository from the selected repositories for a user's codespace secret.
   * You must authenticate using an access token with the `codespace` or `codespace:secrets` scope to use this endpoint. User must have Codespaces access to use this endpoint.
   * GitHub Apps must have write access to the `codespaces_user_secrets` user permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesRemoveRepositoryForSecretForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesRemoveRepositoryForSecretForAuthenticatedUser(params: CodespacesRemoveRepositoryForSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<void> {
    return this.codespacesRemoveRepositoryForSecretForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

  /** Path part for operation `codespacesGetForAuthenticatedUser()` */
  static readonly CodespacesGetForAuthenticatedUserPath = '/user/codespaces/{codespace_name}';

  /**
   * Get a codespace for the authenticated user.
   *
   * Gets information about a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetForAuthenticatedUser$Response(params: CodespacesGetForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesGetForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a codespace for the authenticated user.
   *
   * Gets information about a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetForAuthenticatedUser(params: CodespacesGetForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesGetForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesDeleteForAuthenticatedUser()` */
  static readonly CodespacesDeleteForAuthenticatedUserPath = '/user/codespaces/{codespace_name}';

  /**
   * Delete a codespace for the authenticated user.
   *
   * Deletes a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesDeleteForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteForAuthenticatedUser$Response(params: CodespacesDeleteForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return codespacesDeleteForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a codespace for the authenticated user.
   *
   * Deletes a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesDeleteForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesDeleteForAuthenticatedUser(params: CodespacesDeleteForAuthenticatedUser$Params, context?: HttpContext): Observable<{
}> {
    return this.codespacesDeleteForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

  /** Path part for operation `codespacesUpdateForAuthenticatedUser()` */
  static readonly CodespacesUpdateForAuthenticatedUserPath = '/user/codespaces/{codespace_name}';

  /**
   * Update a codespace for the authenticated user.
   *
   * Updates a codespace owned by the authenticated user. Currently only the codespace's machine type and recent folders can be modified using this endpoint.
   *
   * If you specify a new machine type it will be applied the next time your codespace is started.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesUpdateForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesUpdateForAuthenticatedUser$Response(params: CodespacesUpdateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesUpdateForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a codespace for the authenticated user.
   *
   * Updates a codespace owned by the authenticated user. Currently only the codespace's machine type and recent folders can be modified using this endpoint.
   *
   * If you specify a new machine type it will be applied the next time your codespace is started.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesUpdateForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesUpdateForAuthenticatedUser(params: CodespacesUpdateForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesUpdateForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesExportForAuthenticatedUser()` */
  static readonly CodespacesExportForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/exports';

  /**
   * Export a codespace for the authenticated user.
   *
   * Triggers an export of the specified codespace and returns a URL and ID where the status of the export can be monitored.
   *
   * If changes cannot be pushed to the codespace's repository, they will be pushed to a new or previously-existing fork instead.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesExportForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesExportForAuthenticatedUser$Response(params: CodespacesExportForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespaceExportDetails>> {
    return codespacesExportForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Export a codespace for the authenticated user.
   *
   * Triggers an export of the specified codespace and returns a URL and ID where the status of the export can be monitored.
   *
   * If changes cannot be pushed to the codespace's repository, they will be pushed to a new or previously-existing fork instead.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesExportForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesExportForAuthenticatedUser(params: CodespacesExportForAuthenticatedUser$Params, context?: HttpContext): Observable<CodespaceExportDetails> {
    return this.codespacesExportForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespaceExportDetails>): CodespaceExportDetails => r.body)
    );
  }

  /** Path part for operation `codespacesGetExportDetailsForAuthenticatedUser()` */
  static readonly CodespacesGetExportDetailsForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/exports/{export_id}';

  /**
   * Get details about a codespace export.
   *
   * Gets information about an export of a codespace.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesGetExportDetailsForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetExportDetailsForAuthenticatedUser$Response(params: CodespacesGetExportDetailsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespaceExportDetails>> {
    return codespacesGetExportDetailsForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Get details about a codespace export.
   *
   * Gets information about an export of a codespace.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesGetExportDetailsForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesGetExportDetailsForAuthenticatedUser(params: CodespacesGetExportDetailsForAuthenticatedUser$Params, context?: HttpContext): Observable<CodespaceExportDetails> {
    return this.codespacesGetExportDetailsForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespaceExportDetails>): CodespaceExportDetails => r.body)
    );
  }

  /** Path part for operation `codespacesCodespaceMachinesForAuthenticatedUser()` */
  static readonly CodespacesCodespaceMachinesForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/machines';

  /**
   * List machine types for a codespace.
   *
   * List the machine types a codespace can transition to use.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesCodespaceMachinesForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesCodespaceMachinesForAuthenticatedUser$Response(params: CodespacesCodespaceMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>> {
    return codespacesCodespaceMachinesForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * List machine types for a codespace.
   *
   * List the machine types a codespace can transition to use.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have read access to the `codespaces_metadata` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesCodespaceMachinesForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesCodespaceMachinesForAuthenticatedUser(params: CodespacesCodespaceMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}> {
    return this.codespacesCodespaceMachinesForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>): {
'total_count': number;
'machines': Array<CodespaceMachine>;
} => r.body)
    );
  }

  /** Path part for operation `codespacesPublishForAuthenticatedUser()` */
  static readonly CodespacesPublishForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/publish';

  /**
   * Create a repository from an unpublished codespace.
   *
   * Publishes an unpublished codespace, creating a new repository and assigning it to the codespace.
   *
   * The codespace's token is granted write permissions to the repository, allowing the user to push their changes.
   *
   * This will fail for a codespace that is already published, meaning it has an associated repository.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesPublishForAuthenticatedUser()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesPublishForAuthenticatedUser$Response(params: CodespacesPublishForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespaceWithFullRepository>> {
    return codespacesPublishForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository from an unpublished codespace.
   *
   * Publishes an unpublished codespace, creating a new repository and assigning it to the codespace.
   *
   * The codespace's token is granted write permissions to the repository, allowing the user to push their changes.
   *
   * This will fail for a codespace that is already published, meaning it has an associated repository.
   *
   * You must authenticate using a personal access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesPublishForAuthenticatedUser$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codespacesPublishForAuthenticatedUser(params: CodespacesPublishForAuthenticatedUser$Params, context?: HttpContext): Observable<CodespaceWithFullRepository> {
    return this.codespacesPublishForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodespaceWithFullRepository>): CodespaceWithFullRepository => r.body)
    );
  }

  /** Path part for operation `codespacesStartForAuthenticatedUser()` */
  static readonly CodespacesStartForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/start';

  /**
   * Start a codespace for the authenticated user.
   *
   * Starts a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesStartForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStartForAuthenticatedUser$Response(params: CodespacesStartForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesStartForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Start a codespace for the authenticated user.
   *
   * Starts a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesStartForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStartForAuthenticatedUser(params: CodespacesStartForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesStartForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

  /** Path part for operation `codespacesStopForAuthenticatedUser()` */
  static readonly CodespacesStopForAuthenticatedUserPath = '/user/codespaces/{codespace_name}/stop';

  /**
   * Stop a codespace for the authenticated user.
   *
   * Stops a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codespacesStopForAuthenticatedUser()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStopForAuthenticatedUser$Response(params: CodespacesStopForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
    return codespacesStopForAuthenticatedUser(this.http, this.rootUrl, params, context);
  }

  /**
   * Stop a codespace for the authenticated user.
   *
   * Stops a user's codespace.
   *
   * You must authenticate using an access token with the `codespace` scope to use this endpoint.
   *
   * GitHub Apps must have write access to the `codespaces_lifecycle_admin` repository permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codespacesStopForAuthenticatedUser$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codespacesStopForAuthenticatedUser(params: CodespacesStopForAuthenticatedUser$Params, context?: HttpContext): Observable<Codespace> {
    return this.codespacesStopForAuthenticatedUser$Response(params, context).pipe(
      map((r: StrictHttpResponse<Codespace>): Codespace => r.body)
    );
  }

}
