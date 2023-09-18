/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CheckAnnotation } from '../models/check-annotation';
import { CheckRun } from '../models/check-run';
import { CheckSuite } from '../models/check-suite';
import { CheckSuitePreference } from '../models/check-suite-preference';
import { checksCreate } from '../fn/checks/checks-create';
import { ChecksCreate$Params } from '../fn/checks/checks-create';
import { checksCreateSuite } from '../fn/checks/checks-create-suite';
import { ChecksCreateSuite$Params } from '../fn/checks/checks-create-suite';
import { checksGet } from '../fn/checks/checks-get';
import { ChecksGet$Params } from '../fn/checks/checks-get';
import { checksGetSuite } from '../fn/checks/checks-get-suite';
import { ChecksGetSuite$Params } from '../fn/checks/checks-get-suite';
import { checksListAnnotations } from '../fn/checks/checks-list-annotations';
import { ChecksListAnnotations$Params } from '../fn/checks/checks-list-annotations';
import { checksListForRef } from '../fn/checks/checks-list-for-ref';
import { ChecksListForRef$Params } from '../fn/checks/checks-list-for-ref';
import { checksListForSuite } from '../fn/checks/checks-list-for-suite';
import { ChecksListForSuite$Params } from '../fn/checks/checks-list-for-suite';
import { checksListSuitesForRef } from '../fn/checks/checks-list-suites-for-ref';
import { ChecksListSuitesForRef$Params } from '../fn/checks/checks-list-suites-for-ref';
import { checksRerequestRun } from '../fn/checks/checks-rerequest-run';
import { ChecksRerequestRun$Params } from '../fn/checks/checks-rerequest-run';
import { checksRerequestSuite } from '../fn/checks/checks-rerequest-suite';
import { ChecksRerequestSuite$Params } from '../fn/checks/checks-rerequest-suite';
import { checksSetSuitesPreferences } from '../fn/checks/checks-set-suites-preferences';
import { ChecksSetSuitesPreferences$Params } from '../fn/checks/checks-set-suites-preferences';
import { checksUpdate } from '../fn/checks/checks-update';
import { ChecksUpdate$Params } from '../fn/checks/checks-update';
import { EmptyObject } from '../models/empty-object';


/**
 * Rich interactions with checks run by your integrations.
 */
@Injectable({ providedIn: 'root' })
export class ChecksService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `checksCreate()` */
  static readonly ChecksCreatePath = '/repos/{owner}/{repo}/check-runs';

  /**
   * Create a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Creates a new check run for a specific commit in a repository. Your GitHub App must have the `checks:write` permission to create check runs.
   *
   * In a check suite, GitHub limits the number of check runs with the same name to 1000. Once these check runs exceed 1000, GitHub will start to automatically delete older check runs.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksCreate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksCreate$Response(params: ChecksCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckRun>> {
    return checksCreate(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Creates a new check run for a specific commit in a repository. Your GitHub App must have the `checks:write` permission to create check runs.
   *
   * In a check suite, GitHub limits the number of check runs with the same name to 1000. Once these check runs exceed 1000, GitHub will start to automatically delete older check runs.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksCreate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksCreate(params: ChecksCreate$Params, context?: HttpContext): Observable<CheckRun> {
    return this.checksCreate$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckRun>): CheckRun => r.body)
    );
  }

  /** Path part for operation `checksGet()` */
  static readonly ChecksGetPath = '/repos/{owner}/{repo}/check-runs/{check_run_id}';

  /**
   * Get a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Gets a single check run using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksGet$Response(params: ChecksGet$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckRun>> {
    return checksGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Gets a single check run using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksGet(params: ChecksGet$Params, context?: HttpContext): Observable<CheckRun> {
    return this.checksGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckRun>): CheckRun => r.body)
    );
  }

  /** Path part for operation `checksUpdate()` */
  static readonly ChecksUpdatePath = '/repos/{owner}/{repo}/check-runs/{check_run_id}';

  /**
   * Update a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Updates a check run for a specific commit in a repository. Your GitHub App must have the `checks:write` permission to edit check runs.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksUpdate()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksUpdate$Response(params: ChecksUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckRun>> {
    return checksUpdate(this.http, this.rootUrl, params, context);
  }

  /**
   * Update a check run.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Updates a check run for a specific commit in a repository. Your GitHub App must have the `checks:write` permission to edit check runs.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksUpdate$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksUpdate(params: ChecksUpdate$Params, context?: HttpContext): Observable<CheckRun> {
    return this.checksUpdate$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckRun>): CheckRun => r.body)
    );
  }

  /** Path part for operation `checksListAnnotations()` */
  static readonly ChecksListAnnotationsPath = '/repos/{owner}/{repo}/check-runs/{check_run_id}/annotations';

  /**
   * List check run annotations.
   *
   * Lists annotations for a check run using the annotation `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get annotations for a check run. OAuth apps and authenticated users must have the `repo` scope to get annotations for a check run in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksListAnnotations()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListAnnotations$Response(params: ChecksListAnnotations$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CheckAnnotation>>> {
    return checksListAnnotations(this.http, this.rootUrl, params, context);
  }

  /**
   * List check run annotations.
   *
   * Lists annotations for a check run using the annotation `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get annotations for a check run. OAuth apps and authenticated users must have the `repo` scope to get annotations for a check run in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksListAnnotations$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListAnnotations(params: ChecksListAnnotations$Params, context?: HttpContext): Observable<Array<CheckAnnotation>> {
    return this.checksListAnnotations$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CheckAnnotation>>): Array<CheckAnnotation> => r.body)
    );
  }

  /** Path part for operation `checksRerequestRun()` */
  static readonly ChecksRerequestRunPath = '/repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest';

  /**
   * Rerequest a check run.
   *
   * Triggers GitHub to rerequest an existing check run, without pushing new code to a repository. This endpoint will trigger the [`check_run` webhook](https://docs.github.com/webhooks/event-payloads/#check_run) event with the action `rerequested`. When a check run is `rerequested`, its `status` is reset to `queued` and the `conclusion` is cleared.
   *
   * To rerequest a check run, your GitHub App must have the `checks:read` permission on a private repository or pull access to a public repository.
   *
   * For more information about how to re-run GitHub Actions jobs, see "[Re-run a job from a workflow run](https://docs.github.com/rest/actions/workflow-runs#re-run-a-job-from-a-workflow-run)".
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksRerequestRun()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksRerequestRun$Response(params: ChecksRerequestRun$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return checksRerequestRun(this.http, this.rootUrl, params, context);
  }

  /**
   * Rerequest a check run.
   *
   * Triggers GitHub to rerequest an existing check run, without pushing new code to a repository. This endpoint will trigger the [`check_run` webhook](https://docs.github.com/webhooks/event-payloads/#check_run) event with the action `rerequested`. When a check run is `rerequested`, its `status` is reset to `queued` and the `conclusion` is cleared.
   *
   * To rerequest a check run, your GitHub App must have the `checks:read` permission on a private repository or pull access to a public repository.
   *
   * For more information about how to re-run GitHub Actions jobs, see "[Re-run a job from a workflow run](https://docs.github.com/rest/actions/workflow-runs#re-run-a-job-from-a-workflow-run)".
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksRerequestRun$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksRerequestRun(params: ChecksRerequestRun$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.checksRerequestRun$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `checksCreateSuite()` */
  static readonly ChecksCreateSuitePath = '/repos/{owner}/{repo}/check-suites';

  /**
   * Create a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * By default, check suites are automatically created when you create a [check run](https://docs.github.com/rest/checks/runs). You only need to use this endpoint for manually creating check suites when you've disabled automatic creation using "[Update repository preferences for check suites](https://docs.github.com/rest/checks/suites#update-repository-preferences-for-check-suites)". Your GitHub App must have the `checks:write` permission to create check suites.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksCreateSuite()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksCreateSuite$Response(params: ChecksCreateSuite$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckSuite>> {
    return checksCreateSuite(this.http, this.rootUrl, params, context);
  }

  /**
   * Create a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * By default, check suites are automatically created when you create a [check run](https://docs.github.com/rest/checks/runs). You only need to use this endpoint for manually creating check suites when you've disabled automatic creation using "[Update repository preferences for check suites](https://docs.github.com/rest/checks/suites#update-repository-preferences-for-check-suites)". Your GitHub App must have the `checks:write` permission to create check suites.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksCreateSuite$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksCreateSuite(params: ChecksCreateSuite$Params, context?: HttpContext): Observable<CheckSuite> {
    return this.checksCreateSuite$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckSuite>): CheckSuite => r.body)
    );
  }

  /** Path part for operation `checksSetSuitesPreferences()` */
  static readonly ChecksSetSuitesPreferencesPath = '/repos/{owner}/{repo}/check-suites/preferences';

  /**
   * Update repository preferences for check suites.
   *
   * Changes the default automatic flow when creating check suites. By default, a check suite is automatically created each time code is pushed to a repository. When you disable the automatic creation of check suites, you can manually [Create a check suite](https://docs.github.com/rest/checks/suites#create-a-check-suite). You must have admin permissions in the repository to set preferences for check suites.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksSetSuitesPreferences()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksSetSuitesPreferences$Response(params: ChecksSetSuitesPreferences$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckSuitePreference>> {
    return checksSetSuitesPreferences(this.http, this.rootUrl, params, context);
  }

  /**
   * Update repository preferences for check suites.
   *
   * Changes the default automatic flow when creating check suites. By default, a check suite is automatically created each time code is pushed to a repository. When you disable the automatic creation of check suites, you can manually [Create a check suite](https://docs.github.com/rest/checks/suites#create-a-check-suite). You must have admin permissions in the repository to set preferences for check suites.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksSetSuitesPreferences$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  checksSetSuitesPreferences(params: ChecksSetSuitesPreferences$Params, context?: HttpContext): Observable<CheckSuitePreference> {
    return this.checksSetSuitesPreferences$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckSuitePreference>): CheckSuitePreference => r.body)
    );
  }

  /** Path part for operation `checksGetSuite()` */
  static readonly ChecksGetSuitePath = '/repos/{owner}/{repo}/check-suites/{check_suite_id}';

  /**
   * Get a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * Gets a single check suite using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check suites. OAuth apps and authenticated users must have the `repo` scope to get check suites in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksGetSuite()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksGetSuite$Response(params: ChecksGetSuite$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckSuite>> {
    return checksGetSuite(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * Gets a single check suite using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check suites. OAuth apps and authenticated users must have the `repo` scope to get check suites in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksGetSuite$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksGetSuite(params: ChecksGetSuite$Params, context?: HttpContext): Observable<CheckSuite> {
    return this.checksGetSuite$Response(params, context).pipe(
      map((r: StrictHttpResponse<CheckSuite>): CheckSuite => r.body)
    );
  }

  /** Path part for operation `checksListForSuite()` */
  static readonly ChecksListForSuitePath = '/repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs';

  /**
   * List check runs in a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Lists check runs for a check suite using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksListForSuite()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListForSuite$Response(params: ChecksListForSuite$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'check_runs': Array<CheckRun>;
}>> {
    return checksListForSuite(this.http, this.rootUrl, params, context);
  }

  /**
   * List check runs in a check suite.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Lists check runs for a check suite using its `id`. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksListForSuite$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListForSuite(params: ChecksListForSuite$Params, context?: HttpContext): Observable<{
'total_count': number;
'check_runs': Array<CheckRun>;
}> {
    return this.checksListForSuite$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'check_runs': Array<CheckRun>;
}>): {
'total_count': number;
'check_runs': Array<CheckRun>;
} => r.body)
    );
  }

  /** Path part for operation `checksRerequestSuite()` */
  static readonly ChecksRerequestSuitePath = '/repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest';

  /**
   * Rerequest a check suite.
   *
   * Triggers GitHub to rerequest an existing check suite, without pushing new code to a repository. This endpoint will trigger the [`check_suite` webhook](https://docs.github.com/webhooks/event-payloads/#check_suite) event with the action `rerequested`. When a check suite is `rerequested`, its `status` is reset to `queued` and the `conclusion` is cleared.
   *
   * To rerequest a check suite, your GitHub App must have the `checks:write` permission on a private repository or pull access to a public repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksRerequestSuite()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksRerequestSuite$Response(params: ChecksRerequestSuite$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
    return checksRerequestSuite(this.http, this.rootUrl, params, context);
  }

  /**
   * Rerequest a check suite.
   *
   * Triggers GitHub to rerequest an existing check suite, without pushing new code to a repository. This endpoint will trigger the [`check_suite` webhook](https://docs.github.com/webhooks/event-payloads/#check_suite) event with the action `rerequested`. When a check suite is `rerequested`, its `status` is reset to `queued` and the `conclusion` is cleared.
   *
   * To rerequest a check suite, your GitHub App must have the `checks:write` permission on a private repository or pull access to a public repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksRerequestSuite$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksRerequestSuite(params: ChecksRerequestSuite$Params, context?: HttpContext): Observable<EmptyObject> {
    return this.checksRerequestSuite$Response(params, context).pipe(
      map((r: StrictHttpResponse<EmptyObject>): EmptyObject => r.body)
    );
  }

  /** Path part for operation `checksListForRef()` */
  static readonly ChecksListForRefPath = '/repos/{owner}/{repo}/commits/{ref}/check-runs';

  /**
   * List check runs for a Git reference.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Lists check runs for a commit ref. The `ref` can be a SHA, branch name, or a tag name. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksListForRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListForRef$Response(params: ChecksListForRef$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'check_runs': Array<CheckRun>;
}>> {
    return checksListForRef(this.http, this.rootUrl, params, context);
  }

  /**
   * List check runs for a Git reference.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array.
   *
   * Lists check runs for a commit ref. The `ref` can be a SHA, branch name, or a tag name. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to get check runs. OAuth apps and authenticated users must have the `repo` scope to get check runs in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksListForRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListForRef(params: ChecksListForRef$Params, context?: HttpContext): Observable<{
'total_count': number;
'check_runs': Array<CheckRun>;
}> {
    return this.checksListForRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'check_runs': Array<CheckRun>;
}>): {
'total_count': number;
'check_runs': Array<CheckRun>;
} => r.body)
    );
  }

  /** Path part for operation `checksListSuitesForRef()` */
  static readonly ChecksListSuitesForRefPath = '/repos/{owner}/{repo}/commits/{ref}/check-suites';

  /**
   * List check suites for a Git reference.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * Lists check suites for a commit `ref`. The `ref` can be a SHA, branch name, or a tag name. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to list check suites. OAuth apps and authenticated users must have the `repo` scope to get check suites in a private repository.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `checksListSuitesForRef()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListSuitesForRef$Response(params: ChecksListSuitesForRef$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'check_suites': Array<CheckSuite>;
}>> {
    return checksListSuitesForRef(this.http, this.rootUrl, params, context);
  }

  /**
   * List check suites for a Git reference.
   *
   * **Note:** The Checks API only looks for pushes in the repository where the check suite or check run were created. Pushes to a branch in a forked repository are not detected and return an empty `pull_requests` array and a `null` value for `head_branch`.
   *
   * Lists check suites for a commit `ref`. The `ref` can be a SHA, branch name, or a tag name. GitHub Apps must have the `checks:read` permission on a private repository or pull access to a public repository to list check suites. OAuth apps and authenticated users must have the `repo` scope to get check suites in a private repository.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `checksListSuitesForRef$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  checksListSuitesForRef(params: ChecksListSuitesForRef$Params, context?: HttpContext): Observable<{
'total_count': number;
'check_suites': Array<CheckSuite>;
}> {
    return this.checksListSuitesForRef$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'check_suites': Array<CheckSuite>;
}>): {
'total_count': number;
'check_suites': Array<CheckSuite>;
} => r.body)
    );
  }

}
