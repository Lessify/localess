/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { HookDelivery } from '../../models/hook-delivery';

export interface OrgsGetWebhookDelivery$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;
  delivery_id: number;
}

export function orgsGetWebhookDelivery(http: HttpClient, rootUrl: string, params: OrgsGetWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<HookDelivery>> {
  const rb = new RequestBuilder(rootUrl, orgsGetWebhookDelivery.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('hook_id', params.hook_id, {});
    rb.path('delivery_id', params.delivery_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<HookDelivery>;
    })
  );
}

orgsGetWebhookDelivery.PATH = '/orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}';
