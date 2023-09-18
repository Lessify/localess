/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CheckSuite } from '../../models/check-suite';

export interface ChecksCreateSuite$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * The sha of the head commit.
 */
'head_sha': string;
}
}

export function checksCreateSuite(http: HttpClient, rootUrl: string, params: ChecksCreateSuite$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckSuite>> {
  const rb = new RequestBuilder(rootUrl, checksCreateSuite.PATH, 'post');
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
      return r as StrictHttpResponse<CheckSuite>;
    })
  );
}

checksCreateSuite.PATH = '/repos/{owner}/{repo}/check-suites';
