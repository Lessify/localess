/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningAnalysis } from '../../models/code-scanning-analysis';

export interface CodeScanningGetAnalysis$Json$Params {

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
}

export function codeScanningGetAnalysis$Json(http: HttpClient, rootUrl: string, params: CodeScanningGetAnalysis$Json$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningAnalysis>> {
  const rb = new RequestBuilder(rootUrl, codeScanningGetAnalysis$Json.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('analysis_id', params.analysis_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeScanningAnalysis>;
    })
  );
}

codeScanningGetAnalysis$Json.PATH = '/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}';
