/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CodeScanningAlert } from '../models/code-scanning-alert';
import { CodeScanningAlertInstance } from '../models/code-scanning-alert-instance';
import { CodeScanningAlertItems } from '../models/code-scanning-alert-items';
import { CodeScanningAnalysis } from '../models/code-scanning-analysis';
import { CodeScanningAnalysisDeletion } from '../models/code-scanning-analysis-deletion';
import { CodeScanningCodeqlDatabase } from '../models/code-scanning-codeql-database';
import { CodeScanningDefaultSetup } from '../models/code-scanning-default-setup';
import { CodeScanningOrganizationAlertItems } from '../models/code-scanning-organization-alert-items';
import { CodeScanningSarifsReceipt } from '../models/code-scanning-sarifs-receipt';
import { CodeScanningSarifsStatus } from '../models/code-scanning-sarifs-status';
import { codeScanningDeleteAnalysis } from '../fn/code-scanning/code-scanning-delete-analysis';
import { CodeScanningDeleteAnalysis$Params } from '../fn/code-scanning/code-scanning-delete-analysis';
import { codeScanningGetAlert } from '../fn/code-scanning/code-scanning-get-alert';
import { CodeScanningGetAlert$Params } from '../fn/code-scanning/code-scanning-get-alert';
import { codeScanningGetAnalysis$Json } from '../fn/code-scanning/code-scanning-get-analysis-json';
import { CodeScanningGetAnalysis$Json$Params } from '../fn/code-scanning/code-scanning-get-analysis-json';
import { codeScanningGetAnalysis$Sarif } from '../fn/code-scanning/code-scanning-get-analysis-sarif';
import { CodeScanningGetAnalysis$Sarif$Params } from '../fn/code-scanning/code-scanning-get-analysis-sarif';
import { codeScanningGetCodeqlDatabase } from '../fn/code-scanning/code-scanning-get-codeql-database';
import { CodeScanningGetCodeqlDatabase$Params } from '../fn/code-scanning/code-scanning-get-codeql-database';
import { codeScanningGetDefaultSetup } from '../fn/code-scanning/code-scanning-get-default-setup';
import { CodeScanningGetDefaultSetup$Params } from '../fn/code-scanning/code-scanning-get-default-setup';
import { codeScanningGetSarif } from '../fn/code-scanning/code-scanning-get-sarif';
import { CodeScanningGetSarif$Params } from '../fn/code-scanning/code-scanning-get-sarif';
import { codeScanningListAlertInstances } from '../fn/code-scanning/code-scanning-list-alert-instances';
import { CodeScanningListAlertInstances$Params } from '../fn/code-scanning/code-scanning-list-alert-instances';
import { codeScanningListAlertsForOrg } from '../fn/code-scanning/code-scanning-list-alerts-for-org';
import { CodeScanningListAlertsForOrg$Params } from '../fn/code-scanning/code-scanning-list-alerts-for-org';
import { codeScanningListAlertsForRepo } from '../fn/code-scanning/code-scanning-list-alerts-for-repo';
import { CodeScanningListAlertsForRepo$Params } from '../fn/code-scanning/code-scanning-list-alerts-for-repo';
import { codeScanningListCodeqlDatabases } from '../fn/code-scanning/code-scanning-list-codeql-databases';
import { CodeScanningListCodeqlDatabases$Params } from '../fn/code-scanning/code-scanning-list-codeql-databases';
import { codeScanningListRecentAnalyses } from '../fn/code-scanning/code-scanning-list-recent-analyses';
import { CodeScanningListRecentAnalyses$Params } from '../fn/code-scanning/code-scanning-list-recent-analyses';
import { codeScanningUpdateAlert } from '../fn/code-scanning/code-scanning-update-alert';
import { CodeScanningUpdateAlert$Params } from '../fn/code-scanning/code-scanning-update-alert';
import { codeScanningUpdateDefaultSetup } from '../fn/code-scanning/code-scanning-update-default-setup';
import { CodeScanningUpdateDefaultSetup$Params } from '../fn/code-scanning/code-scanning-update-default-setup';
import { codeScanningUploadSarif } from '../fn/code-scanning/code-scanning-upload-sarif';
import { CodeScanningUploadSarif$Params } from '../fn/code-scanning/code-scanning-upload-sarif';
import { EmptyObject } from '../models/empty-object';


/**
 * Retrieve code scanning alerts from a repository.
 */
@Injectable({ providedIn: 'root' })
export class CodeScanningService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `codeScanningListAlertsForOrg()` */
  static readonly CodeScanningListAlertsForOrgPath = '/orgs/{org}/code-scanning/alerts';

  /**
   * List code scanning alerts for an organization.
   *
   * Lists code scanning alerts for the default branch for all eligible repositories in an organization. Eligible repositories are repositories that are owned by organizations that you own or for which you are a security manager. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   *
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningListAlertsForOrg()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertsForOrg$Response(params: CodeScanningListAlertsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningOrganizationAlertItems>>> {
    return codeScanningListAlertsForOrg(this.http, this.rootUrl, params, context);
  }

  /**
   * List code scanning alerts for an organization.
   *
   * Lists code scanning alerts for the default branch for all eligible repositories in an organization. Eligible repositories are repositories that are owned by organizations that you own or for which you are a security manager. For more information, see "[Managing security managers in your organization](https://docs.github.com/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)."
   *
   * To use this endpoint, you must be an owner or security manager for the organization, and you must use an access token with the `repo` scope or `security_events` scope.
   *
   * For public repositories, you may instead use the `public_repo` scope.
   *
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningListAlertsForOrg$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertsForOrg(params: CodeScanningListAlertsForOrg$Params, context?: HttpContext): Observable<Array<CodeScanningOrganizationAlertItems>> {
    return this.codeScanningListAlertsForOrg$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeScanningOrganizationAlertItems>>): Array<CodeScanningOrganizationAlertItems> => r.body)
    );
  }

  /** Path part for operation `codeScanningListAlertsForRepo()` */
  static readonly CodeScanningListAlertsForRepoPath = '/repos/{owner}/{repo}/code-scanning/alerts';

  /**
   * List code scanning alerts for a repository.
   *
   * Lists code scanning alerts.
   *
   * To use this endpoint, you must use an access token with the `security_events` scope or, for alerts from public repositories only, an access token with the `public_repo` scope.
   *
   * GitHub Apps must have the `security_events` read
   * permission to use this endpoint.
   *
   * The response includes a `most_recent_instance` object.
   * This provides details of the most recent instance of this alert
   * for the default branch (or for the specified Git reference if you used `ref` in the request).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningListAlertsForRepo()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertsForRepo$Response(params: CodeScanningListAlertsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningAlertItems>>> {
    return codeScanningListAlertsForRepo(this.http, this.rootUrl, params, context);
  }

  /**
   * List code scanning alerts for a repository.
   *
   * Lists code scanning alerts.
   *
   * To use this endpoint, you must use an access token with the `security_events` scope or, for alerts from public repositories only, an access token with the `public_repo` scope.
   *
   * GitHub Apps must have the `security_events` read
   * permission to use this endpoint.
   *
   * The response includes a `most_recent_instance` object.
   * This provides details of the most recent instance of this alert
   * for the default branch (or for the specified Git reference if you used `ref` in the request).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningListAlertsForRepo$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertsForRepo(params: CodeScanningListAlertsForRepo$Params, context?: HttpContext): Observable<Array<CodeScanningAlertItems>> {
    return this.codeScanningListAlertsForRepo$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeScanningAlertItems>>): Array<CodeScanningAlertItems> => r.body)
    );
  }

  /** Path part for operation `codeScanningGetAlert()` */
  static readonly CodeScanningGetAlertPath = '/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}';

  /**
   * Get a code scanning alert.
   *
   * Gets a single code scanning alert. You must use an access token with the `security_events` scope to use this endpoint with private repos, the `public_repo` scope also grants permission to read security events on public repos only. GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetAlert()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAlert$Response(params: CodeScanningGetAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAlert>> {
    return codeScanningGetAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a code scanning alert.
   *
   * Gets a single code scanning alert. You must use an access token with the `security_events` scope to use this endpoint with private repos, the `public_repo` scope also grants permission to read security events on public repos only. GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetAlert$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAlert(params: CodeScanningGetAlert$Params, context?: HttpContext): Observable<CodeScanningAlert> {
    return this.codeScanningGetAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningAlert>): CodeScanningAlert => r.body)
    );
  }

  /** Path part for operation `codeScanningUpdateAlert()` */
  static readonly CodeScanningUpdateAlertPath = '/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}';

  /**
   * Update a code scanning alert.
   *
   * Updates the status of a single code scanning alert. You must use an access token with the `security_events` scope to use this endpoint with private repositories. You can also use tokens with the `public_repo` scope for public repositories only. GitHub Apps must have the `security_events` write permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningUpdateAlert()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUpdateAlert$Response(params: CodeScanningUpdateAlert$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAlert>> {
    return codeScanningUpdateAlert(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a code scanning alert.
   *
   * Updates the status of a single code scanning alert. You must use an access token with the `security_events` scope to use this endpoint with private repositories. You can also use tokens with the `public_repo` scope for public repositories only. GitHub Apps must have the `security_events` write permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningUpdateAlert$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUpdateAlert(params: CodeScanningUpdateAlert$Params, context?: HttpContext): Observable<CodeScanningAlert> {
    return this.codeScanningUpdateAlert$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningAlert>): CodeScanningAlert => r.body)
    );
  }

  /** Path part for operation `codeScanningListAlertInstances()` */
  static readonly CodeScanningListAlertInstancesPath = '/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances';

  /**
   * List instances of a code scanning alert.
   *
   * Lists all instances of the specified code scanning alert.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningListAlertInstances()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertInstances$Response(params: CodeScanningListAlertInstances$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningAlertInstance>>> {
    return codeScanningListAlertInstances(this.http, this.rootUrl, params, context);
  }

  /**
   * List instances of a code scanning alert.
   *
   * Lists all instances of the specified code scanning alert.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningListAlertInstances$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListAlertInstances(params: CodeScanningListAlertInstances$Params, context?: HttpContext): Observable<Array<CodeScanningAlertInstance>> {
    return this.codeScanningListAlertInstances$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeScanningAlertInstance>>): Array<CodeScanningAlertInstance> => r.body)
    );
  }

  /** Path part for operation `codeScanningListRecentAnalyses()` */
  static readonly CodeScanningListRecentAnalysesPath = '/repos/{owner}/{repo}/code-scanning/analyses';

  /**
   * List code scanning analyses for a repository.
   *
   * Lists the details of all code scanning analyses for a repository,
   * starting with the most recent.
   * The response is paginated and you can use the `page` and `per_page` parameters
   * to list the analyses you're interested in.
   * By default 30 analyses are listed per page.
   *
   * The `rules_count` field in the response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * **Deprecation notice**:
   * The `tool_name` field is deprecated and will, in future, not be included in the response for this endpoint. The example response reflects this change. The tool name can now be found inside the `tool` field.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningListRecentAnalyses()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListRecentAnalyses$Response(params: CodeScanningListRecentAnalyses$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningAnalysis>>> {
    return codeScanningListRecentAnalyses(this.http, this.rootUrl, params, context);
  }

  /**
   * List code scanning analyses for a repository.
   *
   * Lists the details of all code scanning analyses for a repository,
   * starting with the most recent.
   * The response is paginated and you can use the `page` and `per_page` parameters
   * to list the analyses you're interested in.
   * By default 30 analyses are listed per page.
   *
   * The `rules_count` field in the response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * **Deprecation notice**:
   * The `tool_name` field is deprecated and will, in future, not be included in the response for this endpoint. The example response reflects this change. The tool name can now be found inside the `tool` field.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningListRecentAnalyses$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListRecentAnalyses(params: CodeScanningListRecentAnalyses$Params, context?: HttpContext): Observable<Array<CodeScanningAnalysis>> {
    return this.codeScanningListRecentAnalyses$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeScanningAnalysis>>): Array<CodeScanningAnalysis> => r.body)
    );
  }

  /** Path part for operation `codeScanningGetAnalysis()` */
  static readonly CodeScanningGetAnalysisPath = '/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}';

  /**
   * Get a code scanning analysis for a repository.
   *
   * Gets a specified code scanning analysis for a repository.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * The default JSON response contains fields that describe the analysis.
   * This includes the Git reference and commit SHA to which the analysis relates,
   * the datetime of the analysis, the name of the code scanning tool,
   * and the number of alerts.
   *
   * The `rules_count` field in the default response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * If you use the Accept header `application/sarif+json`,
   * the response contains the analysis data that was uploaded.
   * This is formatted as
   * [SARIF version 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/cs01/sarif-v2.1.0-cs01.html).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetAnalysis$Json()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAnalysis$Json$Response(params: CodeScanningGetAnalysis$Json$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAnalysis>> {
    return codeScanningGetAnalysis$Json(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a code scanning analysis for a repository.
   *
   * Gets a specified code scanning analysis for a repository.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * The default JSON response contains fields that describe the analysis.
   * This includes the Git reference and commit SHA to which the analysis relates,
   * the datetime of the analysis, the name of the code scanning tool,
   * and the number of alerts.
   *
   * The `rules_count` field in the default response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * If you use the Accept header `application/sarif+json`,
   * the response contains the analysis data that was uploaded.
   * This is formatted as
   * [SARIF version 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/cs01/sarif-v2.1.0-cs01.html).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetAnalysis$Json$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAnalysis$Json(params: CodeScanningGetAnalysis$Json$Params, context?: HttpContext): Observable<CodeScanningAnalysis> {
    return this.codeScanningGetAnalysis$Json$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningAnalysis>): CodeScanningAnalysis => r.body)
    );
  }

  /**
   * Get a code scanning analysis for a repository.
   *
   * Gets a specified code scanning analysis for a repository.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * The default JSON response contains fields that describe the analysis.
   * This includes the Git reference and commit SHA to which the analysis relates,
   * the datetime of the analysis, the name of the code scanning tool,
   * and the number of alerts.
   *
   * The `rules_count` field in the default response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * If you use the Accept header `application/sarif+json`,
   * the response contains the analysis data that was uploaded.
   * This is formatted as
   * [SARIF version 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/cs01/sarif-v2.1.0-cs01.html).
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetAnalysis$Sarif()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAnalysis$Sarif$Response(params: CodeScanningGetAnalysis$Sarif$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: any;
}>> {
    return codeScanningGetAnalysis$Sarif(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a code scanning analysis for a repository.
   *
   * Gets a specified code scanning analysis for a repository.
   * You must use an access token with the `security_events` scope to use this endpoint with private repos,
   * the `public_repo` scope also grants permission to read security events on public repos only.
   * GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * The default JSON response contains fields that describe the analysis.
   * This includes the Git reference and commit SHA to which the analysis relates,
   * the datetime of the analysis, the name of the code scanning tool,
   * and the number of alerts.
   *
   * The `rules_count` field in the default response give the number of rules
   * that were run in the analysis.
   * For very old analyses this data is not available,
   * and `0` is returned in this field.
   *
   * If you use the Accept header `application/sarif+json`,
   * the response contains the analysis data that was uploaded.
   * This is formatted as
   * [SARIF version 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/cs01/sarif-v2.1.0-cs01.html).
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetAnalysis$Sarif$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetAnalysis$Sarif(params: CodeScanningGetAnalysis$Sarif$Params, context?: HttpContext): Observable<{
[key: string]: any;
}> {
    return this.codeScanningGetAnalysis$Sarif$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
[key: string]: any;
}>): {
[key: string]: any;
} => r.body)
    );
  }

  /** Path part for operation `codeScanningDeleteAnalysis()` */
  static readonly CodeScanningDeleteAnalysisPath = '/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}';

  /**
   * Delete a code scanning analysis from a repository.
   *
   * Deletes a specified code scanning analysis from a repository. For
   * private repositories, you must use an access token with the `repo` scope. For public repositories,
   * you must use an access token with `public_repo` scope.
   * GitHub Apps must have the `security_events` write permission to use this endpoint.
   *
   * You can delete one analysis at a time.
   * To delete a series of analyses, start with the most recent analysis and work backwards.
   * Conceptually, the process is similar to the undo function in a text editor.
   *
   * When you list the analyses for a repository,
   * one or more will be identified as deletable in the response:
   *
   * ```
   * "deletable": true
   * ```
   *
   * An analysis is deletable when it's the most recent in a set of analyses.
   * Typically, a repository will have multiple sets of analyses
   * for each enabled code scanning tool,
   * where a set is determined by a unique combination of analysis values:
   *
   * * `ref`
   * * `tool`
   * * `category`
   *
   * If you attempt to delete an analysis that is not the most recent in a set,
   * you'll get a 400 response with the message:
   *
   * ```
   * Analysis specified is not deletable.
   * ```
   *
   * The response from a successful `DELETE` operation provides you with
   * two alternative URLs for deleting the next analysis in the set:
   * `next_analysis_url` and `confirm_delete_url`.
   * Use the `next_analysis_url` URL if you want to avoid accidentally deleting the final analysis
   * in a set. This is a useful option if you want to preserve at least one analysis
   * for the specified tool in your repository.
   * Use the `confirm_delete_url` URL if you are content to remove all analyses for a tool.
   * When you delete the last analysis in a set, the value of `next_analysis_url` and `confirm_delete_url`
   * in the 200 response is `null`.
   *
   * As an example of the deletion process,
   * let's imagine that you added a workflow that configured a particular code scanning tool
   * to analyze the code in a repository. This tool has added 15 analyses:
   * 10 on the default branch, and another 5 on a topic branch.
   * You therefore have two separate sets of analyses for this tool.
   * You've now decided that you want to remove all of the analyses for the tool.
   * To do this you must make 15 separate deletion requests.
   * To start, you must find an analysis that's identified as deletable.
   * Each set of analyses always has one that's identified as deletable.
   * Having found the deletable analysis for one of the two sets,
   * delete this analysis and then continue deleting the next analysis in the set until they're all deleted.
   * Then repeat the process for the second set.
   * The procedure therefore consists of a nested loop:
   *
   * **Outer loop**:
   * * List the analyses for the repository, filtered by tool.
   * * Parse this list to find a deletable analysis. If found:
   *
   *   **Inner loop**:
   *   * Delete the identified analysis.
   *   * Parse the response for the value of `confirm_delete_url` and, if found, use this in the next iteration.
   *
   * The above process assumes that you want to remove all trace of the tool's analyses from the GitHub user interface, for the specified repository, and it therefore uses the `confirm_delete_url` value. Alternatively, you could use the `next_analysis_url` value, which would leave the last analysis in each set undeleted to avoid removing a tool's analysis entirely.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningDeleteAnalysis()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningDeleteAnalysis$Response(params: CodeScanningDeleteAnalysis$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAnalysisDeletion>> {
    return codeScanningDeleteAnalysis(this.http, this.rootUrl, params, context);
  }

  /**
   * Delete a code scanning analysis from a repository.
   *
   * Deletes a specified code scanning analysis from a repository. For
   * private repositories, you must use an access token with the `repo` scope. For public repositories,
   * you must use an access token with `public_repo` scope.
   * GitHub Apps must have the `security_events` write permission to use this endpoint.
   *
   * You can delete one analysis at a time.
   * To delete a series of analyses, start with the most recent analysis and work backwards.
   * Conceptually, the process is similar to the undo function in a text editor.
   *
   * When you list the analyses for a repository,
   * one or more will be identified as deletable in the response:
   *
   * ```
   * "deletable": true
   * ```
   *
   * An analysis is deletable when it's the most recent in a set of analyses.
   * Typically, a repository will have multiple sets of analyses
   * for each enabled code scanning tool,
   * where a set is determined by a unique combination of analysis values:
   *
   * * `ref`
   * * `tool`
   * * `category`
   *
   * If you attempt to delete an analysis that is not the most recent in a set,
   * you'll get a 400 response with the message:
   *
   * ```
   * Analysis specified is not deletable.
   * ```
   *
   * The response from a successful `DELETE` operation provides you with
   * two alternative URLs for deleting the next analysis in the set:
   * `next_analysis_url` and `confirm_delete_url`.
   * Use the `next_analysis_url` URL if you want to avoid accidentally deleting the final analysis
   * in a set. This is a useful option if you want to preserve at least one analysis
   * for the specified tool in your repository.
   * Use the `confirm_delete_url` URL if you are content to remove all analyses for a tool.
   * When you delete the last analysis in a set, the value of `next_analysis_url` and `confirm_delete_url`
   * in the 200 response is `null`.
   *
   * As an example of the deletion process,
   * let's imagine that you added a workflow that configured a particular code scanning tool
   * to analyze the code in a repository. This tool has added 15 analyses:
   * 10 on the default branch, and another 5 on a topic branch.
   * You therefore have two separate sets of analyses for this tool.
   * You've now decided that you want to remove all of the analyses for the tool.
   * To do this you must make 15 separate deletion requests.
   * To start, you must find an analysis that's identified as deletable.
   * Each set of analyses always has one that's identified as deletable.
   * Having found the deletable analysis for one of the two sets,
   * delete this analysis and then continue deleting the next analysis in the set until they're all deleted.
   * Then repeat the process for the second set.
   * The procedure therefore consists of a nested loop:
   *
   * **Outer loop**:
   * * List the analyses for the repository, filtered by tool.
   * * Parse this list to find a deletable analysis. If found:
   *
   *   **Inner loop**:
   *   * Delete the identified analysis.
   *   * Parse the response for the value of `confirm_delete_url` and, if found, use this in the next iteration.
   *
   * The above process assumes that you want to remove all trace of the tool's analyses from the GitHub user interface, for the specified repository, and it therefore uses the `confirm_delete_url` value. Alternatively, you could use the `next_analysis_url` value, which would leave the last analysis in each set undeleted to avoid removing a tool's analysis entirely.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningDeleteAnalysis$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningDeleteAnalysis(params: CodeScanningDeleteAnalysis$Params, context?: HttpContext): Observable<CodeScanningAnalysisDeletion> {
    return this.codeScanningDeleteAnalysis$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningAnalysisDeletion>): CodeScanningAnalysisDeletion => r.body)
    );
  }

  /** Path part for operation `codeScanningListCodeqlDatabases()` */
  static readonly CodeScanningListCodeqlDatabasesPath = '/repos/{owner}/{repo}/code-scanning/codeql/databases';

  /**
   * List CodeQL databases for a repository.
   *
   * Lists the CodeQL databases that are available in a repository.
   *
   * For private repositories, you must use an access token with the `security_events` scope.
   * For public repositories, you can use tokens with the `security_events` or `public_repo` scope.
   * GitHub Apps must have the `contents` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningListCodeqlDatabases()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListCodeqlDatabases$Response(params: CodeScanningListCodeqlDatabases$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningCodeqlDatabase>>> {
    return codeScanningListCodeqlDatabases(this.http, this.rootUrl, params, context);
  }

  /**
   * List CodeQL databases for a repository.
   *
   * Lists the CodeQL databases that are available in a repository.
   *
   * For private repositories, you must use an access token with the `security_events` scope.
   * For public repositories, you can use tokens with the `security_events` or `public_repo` scope.
   * GitHub Apps must have the `contents` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningListCodeqlDatabases$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningListCodeqlDatabases(params: CodeScanningListCodeqlDatabases$Params, context?: HttpContext): Observable<Array<CodeScanningCodeqlDatabase>> {
    return this.codeScanningListCodeqlDatabases$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CodeScanningCodeqlDatabase>>): Array<CodeScanningCodeqlDatabase> => r.body)
    );
  }

  /** Path part for operation `codeScanningGetCodeqlDatabase()` */
  static readonly CodeScanningGetCodeqlDatabasePath = '/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}';

  /**
   * Get a CodeQL database for a repository.
   *
   * Gets a CodeQL database for a language in a repository.
   *
   * By default this endpoint returns JSON metadata about the CodeQL database. To
   * download the CodeQL database binary content, set the `Accept` header of the request
   * to [`application/zip`](https://docs.github.com/rest/overview/media-types), and make sure
   * your HTTP client is configured to follow redirects or use the `Location` header
   * to make a second request to get the redirect URL.
   *
   * For private repositories, you must use an access token with the `security_events` scope.
   * For public repositories, you can use tokens with the `security_events` or `public_repo` scope.
   * GitHub Apps must have the `contents` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetCodeqlDatabase()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetCodeqlDatabase$Response(params: CodeScanningGetCodeqlDatabase$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningCodeqlDatabase>> {
    return codeScanningGetCodeqlDatabase(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a CodeQL database for a repository.
   *
   * Gets a CodeQL database for a language in a repository.
   *
   * By default this endpoint returns JSON metadata about the CodeQL database. To
   * download the CodeQL database binary content, set the `Accept` header of the request
   * to [`application/zip`](https://docs.github.com/rest/overview/media-types), and make sure
   * your HTTP client is configured to follow redirects or use the `Location` header
   * to make a second request to get the redirect URL.
   *
   * For private repositories, you must use an access token with the `security_events` scope.
   * For public repositories, you can use tokens with the `security_events` or `public_repo` scope.
   * GitHub Apps must have the `contents` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetCodeqlDatabase$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetCodeqlDatabase(params: CodeScanningGetCodeqlDatabase$Params, context?: HttpContext): Observable<CodeScanningCodeqlDatabase> {
    return this.codeScanningGetCodeqlDatabase$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningCodeqlDatabase>): CodeScanningCodeqlDatabase => r.body)
    );
  }

  /** Path part for operation `codeScanningGetDefaultSetup()` */
  static readonly CodeScanningGetDefaultSetupPath = '/repos/{owner}/{repo}/code-scanning/default-setup';

  /**
   * Get a code scanning default setup configuration.
   *
   * Gets a code scanning default setup configuration.
   * You must use an access token with the `repo` scope to use this endpoint with private repos or the `public_repo`
   * scope for public repos. GitHub Apps must have the `repo` write permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetDefaultSetup()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetDefaultSetup$Response(params: CodeScanningGetDefaultSetup$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningDefaultSetup>> {
    return codeScanningGetDefaultSetup(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a code scanning default setup configuration.
   *
   * Gets a code scanning default setup configuration.
   * You must use an access token with the `repo` scope to use this endpoint with private repos or the `public_repo`
   * scope for public repos. GitHub Apps must have the `repo` write permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetDefaultSetup$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetDefaultSetup(params: CodeScanningGetDefaultSetup$Params, context?: HttpContext): Observable<CodeScanningDefaultSetup> {
    return this.codeScanningGetDefaultSetup$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningDefaultSetup>): CodeScanningDefaultSetup => r.body)
    );
  }

  /** Path part for operation `codeScanningUpdateDefaultSetup()` */
  static readonly CodeScanningUpdateDefaultSetupPath = '/repos/{owner}/{repo}/code-scanning/default-setup';

  /**
   * Update a code scanning default setup configuration.
   *
   * Updates a code scanning default setup configuration.
   * You must use an access token with the `repo` scope to use this endpoint with private repos or the `public_repo`
   * scope for public repos. GitHub Apps must have the `repo` write permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningUpdateDefaultSetup()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUpdateDefaultSetup$Response(params: CodeScanningUpdateDefaultSetup$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return codeScanningUpdateDefaultSetup(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a code scanning default setup configuration.
   *
   * Updates a code scanning default setup configuration.
   * You must use an access token with the `repo` scope to use this endpoint with private repos or the `public_repo`
   * scope for public repos. GitHub Apps must have the `repo` write permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningUpdateDefaultSetup$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUpdateDefaultSetup(params: CodeScanningUpdateDefaultSetup$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.codeScanningUpdateDefaultSetup$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `codeScanningUploadSarif()` */
  static readonly CodeScanningUploadSarifPath = '/repos/{owner}/{repo}/code-scanning/sarifs';

  /**
   * Upload an analysis as SARIF data.
   *
   * Uploads SARIF data containing the results of a code scanning analysis to make the results available in a repository. You must use an access token with the `security_events` scope to use this endpoint for private repositories. You can also use tokens with the `public_repo` scope for public repositories only. GitHub Apps must have the `security_events` write permission to use this endpoint. For troubleshooting information, see "[Troubleshooting SARIF uploads](https://docs.github.com/code-security/code-scanning/troubleshooting-sarif)."
   *
   * There are two places where you can upload code scanning results.
   *  - If you upload to a pull request, for example `--ref refs/pull/42/merge` or `--ref refs/pull/42/head`, then the results appear as alerts in a pull request check. For more information, see "[Triaging code scanning alerts in pull requests](/code-security/secure-coding/triaging-code-scanning-alerts-in-pull-requests)."
   *  - If you upload to a branch, for example `--ref refs/heads/my-branch`, then the results appear in the **Security** tab for your repository. For more information, see "[Managing code scanning alerts for your repository](/code-security/secure-coding/managing-code-scanning-alerts-for-your-repository#viewing-the-alerts-for-a-repository)."
   *
   * You must compress the SARIF-formatted analysis data that you want to upload, using `gzip`, and then encode it as a Base64 format string. For example:
   *
   * ```
   * gzip -c analysis-data.sarif | base64 -w0
   * ```
   * <br>
   * SARIF upload supports a maximum number of entries per the following data objects, and an analysis will be rejected if any of these objects is above its maximum value. For some objects, there are additional values over which the entries will be ignored while keeping the most important entries whenever applicable.
   * To get the most out of your analysis when it includes data above the supported limits, try to optimize the analysis configuration. For example, for the CodeQL tool, identify and remove the most noisy queries. For more information, see "[SARIF results exceed one or more limits](https://docs.github.com/code-security/code-scanning/troubleshooting-sarif/results-exceed-limit)."
   *
   *
   * | **SARIF data**                   | **Maximum values** | **Additional limits**                                                            |
   * |----------------------------------|:------------------:|----------------------------------------------------------------------------------|
   * | Runs per file                    |         20         |                                                                                  |
   * | Results per run                  |       25,000       | Only the top 5,000 results will be included, prioritized by severity.            |
   * | Rules per run                    |       25,000       |                                                                                  |
   * | Tool extensions per run          |        100         |                                                                                  |
   * | Thread Flow Locations per result |       10,000       | Only the top 1,000 Thread Flow Locations will be included, using prioritization. |
   * | Location per result	             |       1,000        | Only 100 locations will be included.                                             |
   * | Tags per rule	                   |         20         | Only 10 tags will be included.                                                   |
   *
   *
   * The `202 Accepted` response includes an `id` value.
   * You can use this ID to check the status of the upload by using it in the `/sarifs/{sarif_id}` endpoint.
   * For more information, see "[Get information about a SARIF upload](/rest/code-scanning/code-scanning#get-information-about-a-sarif-upload)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningUploadSarif()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUploadSarif$Response(params: CodeScanningUploadSarif$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningSarifsReceipt>> {
    return codeScanningUploadSarif(this.http, this.rootUrl, params, context);
  }

  /**
   * Upload an analysis as SARIF data.
   *
   * Uploads SARIF data containing the results of a code scanning analysis to make the results available in a repository. You must use an access token with the `security_events` scope to use this endpoint for private repositories. You can also use tokens with the `public_repo` scope for public repositories only. GitHub Apps must have the `security_events` write permission to use this endpoint. For troubleshooting information, see "[Troubleshooting SARIF uploads](https://docs.github.com/code-security/code-scanning/troubleshooting-sarif)."
   *
   * There are two places where you can upload code scanning results.
   *  - If you upload to a pull request, for example `--ref refs/pull/42/merge` or `--ref refs/pull/42/head`, then the results appear as alerts in a pull request check. For more information, see "[Triaging code scanning alerts in pull requests](/code-security/secure-coding/triaging-code-scanning-alerts-in-pull-requests)."
   *  - If you upload to a branch, for example `--ref refs/heads/my-branch`, then the results appear in the **Security** tab for your repository. For more information, see "[Managing code scanning alerts for your repository](/code-security/secure-coding/managing-code-scanning-alerts-for-your-repository#viewing-the-alerts-for-a-repository)."
   *
   * You must compress the SARIF-formatted analysis data that you want to upload, using `gzip`, and then encode it as a Base64 format string. For example:
   *
   * ```
   * gzip -c analysis-data.sarif | base64 -w0
   * ```
   * <br>
   * SARIF upload supports a maximum number of entries per the following data objects, and an analysis will be rejected if any of these objects is above its maximum value. For some objects, there are additional values over which the entries will be ignored while keeping the most important entries whenever applicable.
   * To get the most out of your analysis when it includes data above the supported limits, try to optimize the analysis configuration. For example, for the CodeQL tool, identify and remove the most noisy queries. For more information, see "[SARIF results exceed one or more limits](https://docs.github.com/code-security/code-scanning/troubleshooting-sarif/results-exceed-limit)."
   *
   *
   * | **SARIF data**                   | **Maximum values** | **Additional limits**                                                            |
   * |----------------------------------|:------------------:|----------------------------------------------------------------------------------|
   * | Runs per file                    |         20         |                                                                                  |
   * | Results per run                  |       25,000       | Only the top 5,000 results will be included, prioritized by severity.            |
   * | Rules per run                    |       25,000       |                                                                                  |
   * | Tool extensions per run          |        100         |                                                                                  |
   * | Thread Flow Locations per result |       10,000       | Only the top 1,000 Thread Flow Locations will be included, using prioritization. |
   * | Location per result	             |       1,000        | Only 100 locations will be included.                                             |
   * | Tags per rule	                   |         20         | Only 10 tags will be included.                                                   |
   *
   *
   * The `202 Accepted` response includes an `id` value.
   * You can use this ID to check the status of the upload by using it in the `/sarifs/{sarif_id}` endpoint.
   * For more information, see "[Get information about a SARIF upload](/rest/code-scanning/code-scanning#get-information-about-a-sarif-upload)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningUploadSarif$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  codeScanningUploadSarif(params: CodeScanningUploadSarif$Params, context?: HttpContext): Observable<CodeScanningSarifsReceipt> {
    return this.codeScanningUploadSarif$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningSarifsReceipt>): CodeScanningSarifsReceipt => r.body)
    );
  }

  /** Path part for operation `codeScanningGetSarif()` */
  static readonly CodeScanningGetSarifPath = '/repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}';

  /**
   * Get information about a SARIF upload.
   *
   * Gets information about a SARIF upload, including the status and the URL of the analysis that was uploaded so that you can retrieve details of the analysis. For more information, see "[Get a code scanning analysis for a repository](/rest/code-scanning/code-scanning#get-a-code-scanning-analysis-for-a-repository)." You must use an access token with the `security_events` scope to use this endpoint with private repos, the `public_repo` scope also grants permission to read security events on public repos only. GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `codeScanningGetSarif()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetSarif$Response(params: CodeScanningGetSarif$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningSarifsStatus>> {
    return codeScanningGetSarif(this.http, this.rootUrl, params, context);
  }

  /**
   * Get information about a SARIF upload.
   *
   * Gets information about a SARIF upload, including the status and the URL of the analysis that was uploaded so that you can retrieve details of the analysis. For more information, see "[Get a code scanning analysis for a repository](/rest/code-scanning/code-scanning#get-a-code-scanning-analysis-for-a-repository)." You must use an access token with the `security_events` scope to use this endpoint with private repos, the `public_repo` scope also grants permission to read security events on public repos only. GitHub Apps must have the `security_events` read permission to use this endpoint.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `codeScanningGetSarif$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  codeScanningGetSarif(params: CodeScanningGetSarif$Params, context?: HttpContext): Observable<CodeScanningSarifsStatus> {
    return this.codeScanningGetSarif$Response(params, context).pipe(
      map((r: StrictHttpResponse<CodeScanningSarifsStatus>): CodeScanningSarifsStatus => r.body)
    );
  }

}
