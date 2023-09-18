/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAlertItems } from '../../models/code-scanning-alert-items';
import { CodeScanningAlertSeverity } from '../../models/code-scanning-alert-severity';
import { CodeScanningAlertStateQuery } from '../../models/code-scanning-alert-state-query';
import { CodeScanningAnalysisToolGuid } from '../../models/code-scanning-analysis-tool-guid';
import { CodeScanningAnalysisToolName } from '../../models/code-scanning-analysis-tool-name';
import { CodeScanningRef } from '../../models/code-scanning-ref';

export interface CodeScanningListAlertsForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of a code scanning tool. Only results by this tool will be listed. You can specify the tool by using either `tool_name` or `tool_guid`, but not both.
 */
  tool_name?: CodeScanningAnalysisToolName;

/**
 * The GUID of a code scanning tool. Only results by this tool will be listed. Note that some code scanning tools may not include a GUID in their analysis data. You can specify the tool by using either `tool_guid` or `tool_name`, but not both.
 */
  tool_guid?: null | CodeScanningAnalysisToolGuid;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * The Git reference for the results you want to list. The `ref` for a branch can be formatted either as `refs/heads/<branch name>` or simply `<branch name>`. To reference a pull request use `refs/pull/<number>/merge`.
 */
  ref?: CodeScanningRef;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * The property by which to sort the results.
 */
  sort?: 'created' | 'updated';

/**
 * If specified, only code scanning alerts with this state will be returned.
 */
  state?: CodeScanningAlertStateQuery;

/**
 * If specified, only code scanning alerts with this severity will be returned.
 */
  severity?: CodeScanningAlertSeverity;
}

export function codeScanningListAlertsForRepo(http: HttpClient, rootUrl: string, params: CodeScanningListAlertsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningAlertItems>>> {
  const rb = new RequestBuilder(rootUrl, codeScanningListAlertsForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('tool_name', params.tool_name, {});
    rb.query('tool_guid', params.tool_guid, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.query('ref', params.ref, {});
    rb.query('direction', params.direction, {});
    rb.query('sort', params.sort, {});
    rb.query('state', params.state, {});
    rb.query('severity', params.severity, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CodeScanningAlertItems>>;
    })
  );
}

codeScanningListAlertsForRepo.PATH = '/repos/{owner}/{repo}/code-scanning/alerts';
