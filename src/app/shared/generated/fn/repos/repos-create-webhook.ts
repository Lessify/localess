/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Hook } from '../../models/hook';
import { WebhookConfigContentType } from '../../models/webhook-config-content-type';
import { WebhookConfigInsecureSsl } from '../../models/webhook-config-insecure-ssl';
import { WebhookConfigSecret } from '../../models/webhook-config-secret';
import { WebhookConfigUrl } from '../../models/webhook-config-url';

export interface ReposCreateWebhook$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body?: {

/**
 * Use `web` to create a webhook. Default: `web`. This parameter only accepts the value `web`.
 */
'name'?: string;

/**
 * Key/value pairs to provide settings for this webhook.
 */
'config'?: {
'url'?: WebhookConfigUrl;
'content_type'?: WebhookConfigContentType;
'secret'?: WebhookConfigSecret;
'insecure_ssl'?: WebhookConfigInsecureSsl;
'token'?: string;
'digest'?: string;
};

/**
 * Determines what [events](https://docs.github.com/webhooks/event-payloads) the hook is triggered for.
 */
'events'?: Array<string>;

/**
 * Determines if notifications are sent when the webhook is triggered. Set to `true` to send notifications.
 */
'active'?: boolean;
}
}

export function reposCreateWebhook(http: HttpClient, rootUrl: string, params: ReposCreateWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
  const rb = new RequestBuilder(rootUrl, reposCreateWebhook.PATH, 'post');
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
      return r as StrictHttpResponse<Hook>;
    })
  );
}

reposCreateWebhook.PATH = '/repos/{owner}/{repo}/hooks';
