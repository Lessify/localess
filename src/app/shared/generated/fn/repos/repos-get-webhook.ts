/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Hook } from '../../models/hook';

export interface ReposGetWebhook$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;
}

export function reposGetWebhook(http: HttpClient, rootUrl: string, params: ReposGetWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
  const rb = new RequestBuilder(rootUrl, reposGetWebhook.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('hook_id', params.hook_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Hook>;
    })
  );
}

reposGetWebhook.PATH = '/repos/{owner}/{repo}/hooks/{hook_id}';
