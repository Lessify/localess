/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WebhookConfig } from '../../models/webhook-config';
import { WebhookConfigContentType } from '../../models/webhook-config-content-type';
import { WebhookConfigInsecureSsl } from '../../models/webhook-config-insecure-ssl';
import { WebhookConfigSecret } from '../../models/webhook-config-secret';
import { WebhookConfigUrl } from '../../models/webhook-config-url';

export interface ReposUpdateWebhookConfigForRepo$Params {

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
      body?: {
'url'?: WebhookConfigUrl;
'content_type'?: WebhookConfigContentType;
'secret'?: WebhookConfigSecret;
'insecure_ssl'?: WebhookConfigInsecureSsl;
}
}

export function reposUpdateWebhookConfigForRepo(http: HttpClient, rootUrl: string, params: ReposUpdateWebhookConfigForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateWebhookConfigForRepo.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('hook_id', params.hook_id, {});
    rb.body(params.body, 'application/json');
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

reposUpdateWebhookConfigForRepo.PATH = '/repos/{owner}/{repo}/hooks/{hook_id}/config';
