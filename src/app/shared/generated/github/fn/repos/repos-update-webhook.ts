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

export interface ReposUpdateWebhook$Params {

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
      body: {

/**
 * Key/value pairs to provide settings for this webhook.
 */
'config'?: {
'url': WebhookConfigUrl;
'content_type'?: WebhookConfigContentType;
'secret'?: WebhookConfigSecret;
'insecure_ssl'?: WebhookConfigInsecureSsl;
'address'?: string;
'room'?: string;
};

/**
 * Determines what [events](https://docs.github.com/webhooks/event-payloads) the hook is triggered for. This replaces the entire array of events.
 */
'events'?: Array<string>;

/**
 * Determines a list of events to be added to the list of events that the Hook triggers for.
 */
'add_events'?: Array<string>;

/**
 * Determines a list of events to be removed from the list of events that the Hook triggers for.
 */
'remove_events'?: Array<string>;

/**
 * Determines if notifications are sent when the webhook is triggered. Set to `true` to send notifications.
 */
'active'?: boolean;
}
}

export function reposUpdateWebhook(http: HttpClient, rootUrl: string, params: ReposUpdateWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<Hook>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateWebhook.PATH, 'patch');
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
      return r as StrictHttpResponse<Hook>;
    })
  );
}

reposUpdateWebhook.PATH = '/repos/{owner}/{repo}/hooks/{hook_id}';
