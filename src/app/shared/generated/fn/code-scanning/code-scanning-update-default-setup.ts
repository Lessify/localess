/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeScanningDefaultSetupUpdate } from '../../models/code-scanning-default-setup-update';
import { EmptyObject } from '../../models/empty-object';

export interface CodeScanningUpdateDefaultSetup$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: CodeScanningDefaultSetupUpdate
}

export function codeScanningUpdateDefaultSetup(http: HttpClient, rootUrl: string, params: CodeScanningUpdateDefaultSetup$Params, context?: HttpContext): Observable<StrictHttpResponse<EmptyObject>> {
  const rb = new RequestBuilder(rootUrl, codeScanningUpdateDefaultSetup.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<EmptyObject>;
    })
  );
}

codeScanningUpdateDefaultSetup.PATH = '/repos/{owner}/{repo}/code-scanning/default-setup';
