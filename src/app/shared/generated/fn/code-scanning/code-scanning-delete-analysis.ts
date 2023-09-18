/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAnalysisDeletion } from '../../models/code-scanning-analysis-deletion';

export interface CodeScanningDeleteAnalysis$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The ID of the analysis, as returned from the `GET /repos/{owner}/{repo}/code-scanning/analyses` operation.
 */
  analysis_id: number;

/**
 * Allow deletion if the specified analysis is the last in a set. If you attempt to delete the final analysis in a set without setting this parameter to `true`, you'll get a 400 response with the message: `Analysis is last of its type and deletion may result in the loss of historical alert data. Please specify confirm_delete.`
 */
  confirm_delete?: string;
}

export function codeScanningDeleteAnalysis(http: HttpClient, rootUrl: string, params: CodeScanningDeleteAnalysis$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAnalysisDeletion>> {
  const rb = new RequestBuilder(rootUrl, codeScanningDeleteAnalysis.PATH, 'delete');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('analysis_id', params.analysis_id, {});
    rb.query('confirm_delete', params.confirm_delete, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeScanningAnalysisDeletion>;
    })
  );
}

codeScanningDeleteAnalysis.PATH = '/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}';
