/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MergedUpstream } from '../../models/merged-upstream';

export interface ReposMergeUpstream$Params {

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
 * The name of the branch which should be updated to match upstream.
 */
'branch': string;
}
}

export function reposMergeUpstream(http: HttpClient, rootUrl: string, params: ReposMergeUpstream$Params, context?: HttpContext): Observable<StrictHttpResponse<MergedUpstream>> {
  const rb = new RequestBuilder(rootUrl, reposMergeUpstream.PATH, 'post');
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
      return r as StrictHttpResponse<MergedUpstream>;
    })
  );
}

reposMergeUpstream.PATH = '/repos/{owner}/{repo}/merge-upstream';
