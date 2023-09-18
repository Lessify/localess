/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TagProtection } from '../../models/tag-protection';

export interface ReposCreateTagProtection$Params {

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
 * An optional glob pattern to match against when enforcing tag protection.
 */
'pattern': string;
}
}

export function reposCreateTagProtection(http: HttpClient, rootUrl: string, params: ReposCreateTagProtection$Params, context?: HttpContext): Observable<StrictHttpResponse<TagProtection>> {
  const rb = new RequestBuilder(rootUrl, reposCreateTagProtection.PATH, 'post');
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
      return r as StrictHttpResponse<TagProtection>;
    })
  );
}

reposCreateTagProtection.PATH = '/repos/{owner}/{repo}/tags/protection';
