/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WebhookConfig } from '../../models/webhook-config';

export interface ReposGetWebhookConfigForRepo$Params {

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

export function reposGetWebhookConfigForRepo(http: HttpClient, rootUrl: string, params: ReposGetWebhookConfigForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
  const rb = new RequestBuilder(rootUrl, reposGetWebhookConfigForRepo.PATH, 'get');
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
      return r as StrictHttpResponse<WebhookConfig>;
    })
  );
}

reposGetWebhookConfigForRepo.PATH = '/repos/{owner}/{repo}/hooks/{hook_id}/config';
