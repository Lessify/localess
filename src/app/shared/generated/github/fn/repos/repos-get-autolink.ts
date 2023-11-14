/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Autolink } from '../../models/autolink';

export interface ReposGetAutolink$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the autolink.
 */
  autolink_id: number;
}

export function reposGetAutolink(http: HttpClient, rootUrl: string, params: ReposGetAutolink$Params, context?: HttpContext): Observable<StrictHttpResponse<Autolink>> {
  const rb = new RequestBuilder(rootUrl, reposGetAutolink.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('autolink_id', params.autolink_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Autolink>;
    })
  );
}

reposGetAutolink.PATH = '/repos/{owner}/{repo}/autolinks/{autolink_id}';
