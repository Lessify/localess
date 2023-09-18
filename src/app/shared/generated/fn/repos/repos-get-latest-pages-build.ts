/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PageBuild } from '../../models/page-build';

export interface ReposGetLatestPagesBuild$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function reposGetLatestPagesBuild(http: HttpClient, rootUrl: string, params: ReposGetLatestPagesBuild$Params, context?: HttpContext): Observable<StrictHttpResponse<PageBuild>> {
  const rb = new RequestBuilder(rootUrl, reposGetLatestPagesBuild.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PageBuild>;
    })
  );
}

reposGetLatestPagesBuild.PATH = '/repos/{owner}/{repo}/pages/builds/latest';
