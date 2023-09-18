/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgHook } from '../../models/org-hook';
import { WebhookConfigContentType } from '../../models/webhook-config-content-type';
import { WebhookConfigInsecureSsl } from '../../models/webhook-config-insecure-ssl';
import { WebhookConfigSecret } from '../../models/webhook-config-secret';
import { WebhookConfigUrl } from '../../models/webhook-config-url';

export interface OrgsCreateWebhook$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * Must be passed as "web".
 */
'name': string;

/**
 * Key/value pairs to provide settings for this webhook.
 */
'config': {
'url': WebhookConfigUrl;
'content_type'?: WebhookConfigContentType;
'secret'?: WebhookConfigSecret;
'insecure_ssl'?: WebhookConfigInsecureSsl;
'username'?: string;
'password'?: string;
};

/**
 * Determines what [events](https://docs.github.com/webhooks/event-payloads) the hook is triggered for. Set to `["*"]` to receive all possible events.
 */
'events'?: Array<string>;

/**
 * Determines if notifications are sent when the webhook is triggered. Set to `true` to send notifications.
 */
'active'?: boolean;
}
}

export function orgsCreateWebhook(http: HttpClient, rootUrl: string, params: OrgsCreateWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgHook>> {
  const rb = new RequestBuilder(rootUrl, orgsCreateWebhook.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrgHook>;
    })
  );
}

orgsCreateWebhook.PATH = '/orgs/{org}/hooks';
