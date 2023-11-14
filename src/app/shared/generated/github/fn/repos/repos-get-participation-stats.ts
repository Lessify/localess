/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ParticipationStats } from '../../models/participation-stats';

export interface ReposGetParticipationStats$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function reposGetParticipationStats(http: HttpClient, rootUrl: string, params: ReposGetParticipationStats$Params, context?: HttpContext): Observable<StrictHttpResponse<ParticipationStats>> {
  const rb = new RequestBuilder(rootUrl, reposGetParticipationStats.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ParticipationStats>;
    })
  );
}

reposGetParticipationStats.PATH = '/repos/{owner}/{repo}/stats/participation';
