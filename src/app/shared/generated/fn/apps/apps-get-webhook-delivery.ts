/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { HookDelivery } from '../../models/hook-delivery';

export interface AppsGetWebhookDelivery$Params {
  delivery_id: number;
}

export function appsGetWebhookDelivery(http: HttpClient, rootUrl: string, params: AppsGetWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<HookDelivery>> {
  const rb = new RequestBuilder(rootUrl, appsGetWebhookDelivery.PATH, 'get');
  if (params) {
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

appsGetWebhookDelivery.PATH = '/app/hook/deliveries/{delivery_id}';
