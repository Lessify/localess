/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningSarifsStatus } from '../../models/code-scanning-sarifs-status';

export interface CodeScanningGetSarif$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The SARIF ID obtained after uploading.
 */
  sarif_id: string;
}

export function codeScanningGetSarif(http: HttpClient, rootUrl: string, params: CodeScanningGetSarif$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningSarifsStatus>> {
  const rb = new RequestBuilder(rootUrl, codeScanningGetSarif.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('sarif_id', params.sarif_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeScanningSarifsStatus>;
    })
  );
}

codeScanningGetSarif.PATH = '/repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}';
