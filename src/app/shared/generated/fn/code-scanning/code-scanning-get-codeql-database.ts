/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningCodeqlDatabase } from '../../models/code-scanning-codeql-database';

export interface CodeScanningGetCodeqlDatabase$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The language of the CodeQL database.
 */
  language: string;
}

export function codeScanningGetCodeqlDatabase(http: HttpClient, rootUrl: string, params: CodeScanningGetCodeqlDatabase$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeScanningCodeqlDatabase>> {
  const rb = new RequestBuilder(rootUrl, codeScanningGetCodeqlDatabase.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('language', params.language, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeScanningCodeqlDatabase>;
    })
  );
}

codeScanningGetCodeqlDatabase.PATH = '/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}';
