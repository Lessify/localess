/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PageBuild } from '../../models/page-build';

export interface ReposGetPagesBuild$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
  build_id: number;
}

export function reposGetPagesBuild(http: HttpClient, rootUrl: string, params: ReposGetPagesBuild$Params, context?: HttpContext): Observable<StrictHttpResponse<PageBuild>> {
  const rb = new RequestBuilder(rootUrl, reposGetPagesBuild.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('build_id', params.build_id, {});
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

reposGetPagesBuild.PATH = '/repos/{owner}/{repo}/pages/builds/{build_id}';
