/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Reaction } from '../../models/reaction';

export interface ReactionsCreateForRelease$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the release.
 */
  release_id: number;
      body: {

/**
 * The [reaction type](https://docs.github.com/rest/reactions/reactions#about-reactions) to add to the release.
 */
'content': '+1' | 'laugh' | 'heart' | 'hooray' | 'rocket' | 'eyes';
}
}

export function reactionsCreateForRelease(http: HttpClient, rootUrl: string, params: ReactionsCreateForRelease$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
  const rb = new RequestBuilder(rootUrl, reactionsCreateForRelease.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('release_id', params.release_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Reaction>;
    })
  );
}

reactionsCreateForRelease.PATH = '/repos/{owner}/{repo}/releases/{release_id}/reactions';
