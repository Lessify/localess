/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAnalysis } from '../../models/code-scanning-analysis';
import { CodeScanningAnalysisSarifId } from '../../models/code-scanning-analysis-sarif-id';
import { CodeScanningAnalysisToolGuid } from '../../models/code-scanning-analysis-tool-guid';
import { CodeScanningAnalysisToolName } from '../../models/code-scanning-analysis-tool-name';
import { CodeScanningRef } from '../../models/code-scanning-ref';

export interface CodeScanningListRecentAnalyses$Params {

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
 * The Git reference for the analyses you want to list. The `ref` for a branch can be formatted either as `refs/heads/<branch name>` or simply `<branch name>`. To reference a pull request use `refs/pull/<number>/merge`.
 */
  ref?: CodeScanningRef;

/**
 * Filter analyses belonging to the same SARIF upload.
 */
  sarif_id?: CodeScanningAnalysisSarifId;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * The property by which to sort the results.
 */
  sort?: 'created';
}

export function codeScanningListRecentAnalyses(http: HttpClient, rootUrl: string, params: CodeScanningListRecentAnalyses$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningAnalysis>>> {
  const rb = new RequestBuilder(rootUrl, codeScanningListRecentAnalyses.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('tool_name', params.tool_name, {});
    rb.query('tool_guid', params.tool_guid, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.query('ref', params.ref, {});
    rb.query('sarif_id', params.sarif_id, {});
    rb.query('direction', params.direction, {});
    rb.query('sort', params.sort, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CodeScanningAnalysis>>;
    })
  );
}

codeScanningListRecentAnalyses.PATH = '/repos/{owner}/{repo}/code-scanning/analyses';
