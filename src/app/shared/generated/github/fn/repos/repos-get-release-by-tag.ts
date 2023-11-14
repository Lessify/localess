/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Release } from '../../models/release';

export interface ReposGetReleaseByTag$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * tag parameter
 */
  tag: string;
}

export function reposGetReleaseByTag(http: HttpClient, rootUrl: string, params: ReposGetReleaseByTag$Params, context?: HttpContext): Observable<StrictHttpResponse<Release>> {
  const rb = new RequestBuilder(rootUrl, reposGetReleaseByTag.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('tag', params.tag, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Release>;
    })
  );
}

reposGetReleaseByTag.PATH = '/repos/{owner}/{repo}/releases/tags/{tag}';
