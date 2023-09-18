/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { GlobalAdvisory } from '../models/global-advisory';
import { RepositoryAdvisory } from '../models/repository-advisory';
import { securityAdvisoriesCreatePrivateVulnerabilityReport } from '../fn/security-advisories/security-advisories-create-private-vulnerability-report';
import { SecurityAdvisoriesCreatePrivateVulnerabilityReport$Params } from '../fn/security-advisories/security-advisories-create-private-vulnerability-report';
import { securityAdvisoriesCreateRepositoryAdvisory } from '../fn/security-advisories/security-advisories-create-repository-advisory';
import { SecurityAdvisoriesCreateRepositoryAdvisory$Params } from '../fn/security-advisories/security-advisories-create-repository-advisory';
import { securityAdvisoriesCreateRepositoryAdvisoryCveRequest } from '../fn/security-advisories/security-advisories-create-repository-advisory-cve-request';
import { SecurityAdvisoriesCreateRepositoryAdvisoryCveRequest$Params } from '../fn/security-advisories/security-advisories-create-repository-advisory-cve-request';
import { securityAdvisoriesGetGlobalAdvisory } from '../fn/security-advisories/security-advisories-get-global-advisory';
import { SecurityAdvisoriesGetGlobalAdvisory$Params } from '../fn/security-advisories/security-advisories-get-global-advisory';
import { securityAdvisoriesGetRepositoryAdvisory } from '../fn/security-advisories/security-advisories-get-repository-advisory';
import { SecurityAdvisoriesGetRepositoryAdvisory$Params } from '../fn/security-advisories/security-advisories-get-repository-advisory';
import { securityAdvisoriesListGlobalAdvisories } from '../fn/security-advisories/security-advisories-list-global-advisories';
import { SecurityAdvisoriesListGlobalAdvisories$Params } from '../fn/security-advisories/security-advisories-list-global-advisories';
import { securityAdvisoriesListOrgRepositoryAdvisories } from '../fn/security-advisories/security-advisories-list-org-repository-advisories';
import { SecurityAdvisoriesListOrgRepositoryAdvisories$Params } from '../fn/security-advisories/security-advisories-list-org-repository-advisories';
import { securityAdvisoriesListRepositoryAdvisories } from '../fn/security-advisories/security-advisories-list-repository-advisories';
import { SecurityAdvisoriesListRepositoryAdvisories$Params } from '../fn/security-advisories/security-advisories-list-repository-advisories';
import { securityAdvisoriesUpdateRepositoryAdvisory } from '../fn/security-advisories/security-advisories-update-repository-advisory';
import { SecurityAdvisoriesUpdateRepositoryAdvisory$Params } from '../fn/security-advisories/security-advisories-update-repository-advisory';


/**
 * Manage security advisories.
 */
@Injectable({ providedIn: 'root' })
export class SecurityAdvisoriesService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `securityAdvisoriesListGlobalAdvisories()` */
  static readonly SecurityAdvisoriesListGlobalAdvisoriesPath = '/advisories';

  /**
   * List global security advisories.
   *
   * Lists all global security advisories that match the specified parameters. If no other parameters are defined, the request will return only GitHub-reviewed advisories that are not malware.
   *
   * By default, all responses will exclude advisories for malware, because malware are not standard vulnerabilities. To list advisories for malware, you must include the `type` parameter in your request, with the value `malware`. For more information about the different types of security advisories, see "[About the GitHub Advisory database](https://docs.github.com/code-security/security-advisories/global-security-advisories/about-the-github-advisory-database#about-types-of-security-advisories)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesListGlobalAdvisories()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListGlobalAdvisories$Response(params?: SecurityAdvisoriesListGlobalAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GlobalAdvisory>>> {
    return securityAdvisoriesListGlobalAdvisories(this.http, this.rootUrl, params, context);
  }

  /**
   * List global security advisories.
   *
   * Lists all global security advisories that match the specified parameters. If no other parameters are defined, the request will return only GitHub-reviewed advisories that are not malware.
   *
   * By default, all responses will exclude advisories for malware, because malware are not standard vulnerabilities. To list advisories for malware, you must include the `type` parameter in your request, with the value `malware`. For more information about the different types of security advisories, see "[About the GitHub Advisory database](https://docs.github.com/code-security/security-advisories/global-security-advisories/about-the-github-advisory-database#about-types-of-security-advisories)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesListGlobalAdvisories$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListGlobalAdvisories(params?: SecurityAdvisoriesListGlobalAdvisories$Params, context?: HttpContext): Observable<Array<GlobalAdvisory>> {
    return this.securityAdvisoriesListGlobalAdvisories$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<GlobalAdvisory>>): Array<GlobalAdvisory> => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesGetGlobalAdvisory()` */
  static readonly SecurityAdvisoriesGetGlobalAdvisoryPath = '/advisories/{ghsa_id}';

  /**
   * Get a global security advisory.
   *
   * Gets a global security advisory using its GitHub Security Advisory (GHSA) identifier.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesGetGlobalAdvisory()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesGetGlobalAdvisory$Response(params: SecurityAdvisoriesGetGlobalAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<GlobalAdvisory>> {
    return securityAdvisoriesGetGlobalAdvisory(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a global security advisory.
   *
   * Gets a global security advisory using its GitHub Security Advisory (GHSA) identifier.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesGetGlobalAdvisory$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesGetGlobalAdvisory(params: SecurityAdvisoriesGetGlobalAdvisory$Params, context?: HttpContext): Observable<GlobalAdvisory> {
    return this.securityAdvisoriesGetGlobalAdvisory$Response(params, context).pipe(
      map((r: StrictHttpResponse<GlobalAdvisory>): GlobalAdvisory => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesListOrgRepositoryAdvisories()` */
  static readonly SecurityAdvisoriesListOrgRepositoryAdvisoriesPath = '/orgs/{org}/security-advisories';

  /**
   * List repository security advisories for an organization.
   *
   * Lists repository security advisories for an organization.
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `repository_advisories:write` permission.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesListOrgRepositoryAdvisories()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListOrgRepositoryAdvisories$Response(params: SecurityAdvisoriesListOrgRepositoryAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryAdvisory>>> {
    return securityAdvisoriesListOrgRepositoryAdvisories(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository security advisories for an organization.
   *
   * Lists repository security advisories for an organization.
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `repository_advisories:write` permission.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesListOrgRepositoryAdvisories$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListOrgRepositoryAdvisories(params: SecurityAdvisoriesListOrgRepositoryAdvisories$Params, context?: HttpContext): Observable<Array<RepositoryAdvisory>> {
    return this.securityAdvisoriesListOrgRepositoryAdvisories$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryAdvisory>>): Array<RepositoryAdvisory> => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesListRepositoryAdvisories()` */
  static readonly SecurityAdvisoriesListRepositoryAdvisoriesPath = '/repos/{owner}/{repo}/security-advisories';

  /**
   * List repository security advisories.
   *
   * Lists security advisories in a repository.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:read` permission
   * in order to get published security advisories in a private repository, or any unpublished security advisories that you have access to.
   *
   * You can access unpublished security advisories from a repository if you are a security manager or administrator of that repository, or if you are a collaborator on any security advisory.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesListRepositoryAdvisories()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListRepositoryAdvisories$Response(params: SecurityAdvisoriesListRepositoryAdvisories$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<RepositoryAdvisory>>> {
    return securityAdvisoriesListRepositoryAdvisories(this.http, this.rootUrl, params, context);
  }

  /**
   * List repository security advisories.
   *
   * Lists security advisories in a repository.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:read` permission
   * in order to get published security advisories in a private repository, or any unpublished security advisories that you have access to.
   *
   * You can access unpublished security advisories from a repository if you are a security manager or administrator of that repository, or if you are a collaborator on any security advisory.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesListRepositoryAdvisories$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesListRepositoryAdvisories(params: SecurityAdvisoriesListRepositoryAdvisories$Params, context?: HttpContext): Observable<Array<RepositoryAdvisory>> {
    return this.securityAdvisoriesListRepositoryAdvisories$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<RepositoryAdvisory>>): Array<RepositoryAdvisory> => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesCreateRepositoryAdvisory()` */
  static readonly SecurityAdvisoriesCreateRepositoryAdvisoryPath = '/repos/{owner}/{repo}/security-advisories';

  /**
   * Create a repository security advisory.
   *
   * Creates a new repository security advisory.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to create a draft repository security advisory, you must be a security manager or administrator of that repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesCreateRepositoryAdvisory()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesCreateRepositoryAdvisory$Response(params: SecurityAdvisoriesCreateRepositoryAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryAdvisory>> {
    return securityAdvisoriesCreateRepositoryAdvisory(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a repository security advisory.
   *
   * Creates a new repository security advisory.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to create a draft repository security advisory, you must be a security manager or administrator of that repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesCreateRepositoryAdvisory$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesCreateRepositoryAdvisory(params: SecurityAdvisoriesCreateRepositoryAdvisory$Params, context?: HttpContext): Observable<RepositoryAdvisory> {
    return this.securityAdvisoriesCreateRepositoryAdvisory$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryAdvisory>): RepositoryAdvisory => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesCreatePrivateVulnerabilityReport()` */
  static readonly SecurityAdvisoriesCreatePrivateVulnerabilityReportPath = '/repos/{owner}/{repo}/security-advisories/reports';

  /**
   * Privately report a security vulnerability.
   *
   * Report a security vulnerability to the maintainers of the repository.
   * See "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)" for more information about private vulnerability reporting.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesCreatePrivateVulnerabilityReport()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesCreatePrivateVulnerabilityReport$Response(params: SecurityAdvisoriesCreatePrivateVulnerabilityReport$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryAdvisory>> {
    return securityAdvisoriesCreatePrivateVulnerabilityReport(this.http, this.rootUrl, params, context);
  }

  /**
   * Privately report a security vulnerability.
   *
   * Report a security vulnerability to the maintainers of the repository.
   * See "[Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)" for more information about private vulnerability reporting.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesCreatePrivateVulnerabilityReport$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesCreatePrivateVulnerabilityReport(params: SecurityAdvisoriesCreatePrivateVulnerabilityReport$Params, context?: HttpContext): Observable<RepositoryAdvisory> {
    return this.securityAdvisoriesCreatePrivateVulnerabilityReport$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryAdvisory>): RepositoryAdvisory => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesGetRepositoryAdvisory()` */
  static readonly SecurityAdvisoriesGetRepositoryAdvisoryPath = '/repos/{owner}/{repo}/security-advisories/{ghsa_id}';

  /**
   * Get a repository security advisory.
   *
   * Get a repository security advisory using its GitHub Security Advisory (GHSA) identifier.
   * You can access any published security advisory on a public repository.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:read` permission
   * in order to get a published security advisory in a private repository, or any unpublished security advisory that you have access to.
   *
   * You can access an unpublished security advisory from a repository if you are a security manager or administrator of that repository, or if you are a
   * collaborator on the security advisory.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesGetRepositoryAdvisory()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesGetRepositoryAdvisory$Response(params: SecurityAdvisoriesGetRepositoryAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryAdvisory>> {
    return securityAdvisoriesGetRepositoryAdvisory(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a repository security advisory.
   *
   * Get a repository security advisory using its GitHub Security Advisory (GHSA) identifier.
   * You can access any published security advisory on a public repository.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:read` permission
   * in order to get a published security advisory in a private repository, or any unpublished security advisory that you have access to.
   *
   * You can access an unpublished security advisory from a repository if you are a security manager or administrator of that repository, or if you are a
   * collaborator on the security advisory.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesGetRepositoryAdvisory$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesGetRepositoryAdvisory(params: SecurityAdvisoriesGetRepositoryAdvisory$Params, context?: HttpContext): Observable<RepositoryAdvisory> {
    return this.securityAdvisoriesGetRepositoryAdvisory$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryAdvisory>): RepositoryAdvisory => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesUpdateRepositoryAdvisory()` */
  static readonly SecurityAdvisoriesUpdateRepositoryAdvisoryPath = '/repos/{owner}/{repo}/security-advisories/{ghsa_id}';

  /**
   * Update a repository security advisory.
   *
   * Update a repository security advisory using its GitHub Security Advisory (GHSA) identifier.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to update any security advisory, you must be a security manager or administrator of that repository,
   * or a collaborator on the repository security advisory.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesUpdateRepositoryAdvisory()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesUpdateRepositoryAdvisory$Response(params: SecurityAdvisoriesUpdateRepositoryAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryAdvisory>> {
    return securityAdvisoriesUpdateRepositoryAdvisory(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a repository security advisory.
   *
   * Update a repository security advisory using its GitHub Security Advisory (GHSA) identifier.
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to update any security advisory, you must be a security manager or administrator of that repository,
   * or a collaborator on the repository security advisory.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesUpdateRepositoryAdvisory$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  securityAdvisoriesUpdateRepositoryAdvisory(params: SecurityAdvisoriesUpdateRepositoryAdvisory$Params, context?: HttpContext): Observable<RepositoryAdvisory> {
    return this.securityAdvisoriesUpdateRepositoryAdvisory$Response(params, context).pipe(
      map((r: StrictHttpResponse<RepositoryAdvisory>): RepositoryAdvisory => r.body)
    );
  }

  /** Path part for operation `securityAdvisoriesCreateRepositoryAdvisoryCveRequest()` */
  static readonly SecurityAdvisoriesCreateRepositoryAdvisoryCveRequestPath = '/repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve';

  /**
   * Request a CVE for a repository security advisory.
   *
   * If you want a CVE identification number for the security vulnerability in your project, and don't already have one, you can request a CVE identification number from GitHub. For more information see "[Requesting a CVE identification number](https://docs.github.com/code-security/security-advisories/repository-security-advisories/publishing-a-repository-security-advisory#requesting-a-cve-identification-number-optional)."
   *
   * You may request a CVE for public repositories, but cannot do so for private repositories.
   *
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to request a CVE for a repository security advisory, you must be a security manager or administrator of that repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `securityAdvisoriesCreateRepositoryAdvisoryCveRequest()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesCreateRepositoryAdvisoryCveRequest$Response(params: SecurityAdvisoriesCreateRepositoryAdvisoryCveRequest$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
    return securityAdvisoriesCreateRepositoryAdvisoryCveRequest(this.http, this.rootUrl, params, context);
  }

  /**
   * Request a CVE for a repository security advisory.
   *
   * If you want a CVE identification number for the security vulnerability in your project, and don't already have one, you can request a CVE identification number from GitHub. For more information see "[Requesting a CVE identification number](https://docs.github.com/code-security/security-advisories/repository-security-advisories/publishing-a-repository-security-advisory#requesting-a-cve-identification-number-optional)."
   *
   * You may request a CVE for public repositories, but cannot do so for private repositories.
   *
   * You must authenticate using an access token with the `repo` scope or `repository_advisories:write` permission to use this endpoint.
   *
   * In order to request a CVE for a repository security advisory, you must be a security manager or administrator of that repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `securityAdvisoriesCreateRepositoryAdvisoryCveRequest$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  securityAdvisoriesCreateRepositoryAdvisoryCveRequest(params: SecurityAdvisoriesCreateRepositoryAdvisoryCveRequest$Params, context?: HttpContext): Observable<{
}> {
    return this.securityAdvisoriesCreateRepositoryAdvisoryCveRequest$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
}>): {
} => r.body)
    );
  }

}
