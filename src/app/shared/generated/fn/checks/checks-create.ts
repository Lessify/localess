/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CheckRun } from '../../models/check-run';

export interface ChecksCreate$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: ({
'status': 'completed';
[key: string]: any;
} | {
'status'?: 'queued' | 'in_progress';
[key: string]: any;
})
}

export function checksCreate(http: HttpClient, rootUrl: string, params: ChecksCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<CheckRun>> {
  const rb = new RequestBuilder(rootUrl, checksCreate.PATH, 'post');
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
      return r as StrictHttpResponse<CheckRun>;
    })
  );
}

checksCreate.PATH = '/repos/{owner}/{repo}/check-runs';
