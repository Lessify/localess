/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WebhookConfig } from '../../models/webhook-config';

export interface OrgsGetWebhookConfigForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;
}

export function orgsGetWebhookConfigForOrg(http: HttpClient, rootUrl: string, params: OrgsGetWebhookConfigForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
  const rb = new RequestBuilder(rootUrl, orgsGetWebhookConfigForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

orgsGetWebhookConfigForOrg.PATH = '/orgs/{org}/hooks/{hook_id}/config';
