/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningCodeqlDatabase } from '../../models/code-scanning-codeql-database';

export interface CodeScanningListCodeqlDatabases$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function codeScanningListCodeqlDatabases(http: HttpClient, rootUrl: string, params: CodeScanningListCodeqlDatabases$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeScanningCodeqlDatabase>>> {
  const rb = new RequestBuilder(rootUrl, codeScanningListCodeqlDatabases.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CodeScanningCodeqlDatabase>>;
    })
  );
}

codeScanningListCodeqlDatabases.PATH = '/repos/{owner}/{repo}/code-scanning/codeql/databases';
