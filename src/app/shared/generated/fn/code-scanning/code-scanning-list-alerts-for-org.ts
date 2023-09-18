/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAlertSeverity } from '../../models/code-scanning-alert-severity';
import { CodeScanningAlertStateQuery } from '../../models/code-scanning-alert-state-query';
import { CodeScanningAnalysisToolGuid } from '../../models/code-scanning-analysis-tool-guid';
import { CodeScanningAnalysisToolName } from '../../models/code-scanning-analysis-tool-name';
import { CodeScanningOrganizationAlertItems } from '../../models/code-scanning-organization-alert-items';

export interface CodeScanningListAlertsForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of a code scanning tool. Only results by this tool will be listed. You can specify the tool by using either `tool_name` or `tool_guid`, but not both.
 */
  tool_name?: CodeScanningAnalysisToolName;

/**
 * The GUID of a code scanning tool. Only results by this tool will be listed. Note that some code scanning tools may not include a GUID in their analysis data. You can specify the tool by using either `tool_guid` or `tool_name`, but not both.
 */
  tool_guid?: null | CodeScanningAnalysisToolGuid;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results before this cursor.
 */
  before?: string;

/**
 * A cursor, as given in the [Link header](https://docs.github.com/rest/guides/using-pagination-in-the-rest-api#using-link-headers). If specified, the query only searches for results after this cursor.
 */
  after?: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * If specified, only code scanning alerts with this state will be returned.
 */
  state?: CodeScanningAlertStateQuery;

/**
 * The property by which to sort the results.
 */
  sort?: 'created' | 'updated';

/**
 * If specified, only code scanning alerts with this severity will be returned.
 */
  severity?: CodeScanningAlertSeverity;
}

export function codeScanningListAlertsForOrg(http: HttpClient, rootUrl: string, params: CodeScanningListAlertsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningOrganizationAlertItems>>> {
  const rb = new RequestBuilder(rootUrl, codeScanningListAlertsForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('tool_name', params.tool_name, {});
    rb.query('tool_guid', params.tool_guid, {});
    rb.query('before', params.before, {});
    rb.query('after', params.after, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.query('direction', params.direction, {});
    rb.query('state', params.state, {});
    rb.query('sort', params.sort, {});
    rb.query('severity', params.severity, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CodeScanningOrganizationAlertItems>>;
    })
  );
}

codeScanningListAlertsForOrg.PATH = '/orgs/{org}/code-scanning/alerts';
