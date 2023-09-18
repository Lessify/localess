/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodeScanningGetAnalysis$Sarif$Params {

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

export function codeScanningGetAnalysis$Sarif(http: HttpClient, rootUrl: string, params: CodeScanningGetAnalysis$Sarif$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: any;
}>> {
  const rb = new RequestBuilder(rootUrl, codeScanningGetAnalysis$Sarif.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('analysis_id', params.analysis_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json+sarif', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      [key: string]: any;
      }>;
    })
  );
}

codeScanningGetAnalysis$Sarif.PATH = '/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}';
