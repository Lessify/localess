/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CloneTraffic } from '../../models/clone-traffic';

export interface ReposGetClones$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The time frame to display results for.
 */
  per?: 'day' | 'week';
}

export function reposGetClones(http: HttpClient, rootUrl: string, params: ReposGetClones$Params, context?: HttpContext): Observable<StrictHttpResponse<CloneTraffic>> {
  const rb = new RequestBuilder(rootUrl, reposGetClones.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('per', params.per, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CloneTraffic>;
    })
  );
}

reposGetClones.PATH = '/repos/{owner}/{repo}/traffic/clones';
