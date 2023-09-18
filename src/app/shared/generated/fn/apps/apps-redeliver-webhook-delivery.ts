/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface AppsRedeliverWebhookDelivery$Params {
  delivery_id: number;
}

export function appsRedeliverWebhookDelivery(http: HttpClient, rootUrl: string, params: AppsRedeliverWebhookDelivery$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, appsRedeliverWebhookDelivery.PATH, 'post');
  if (params) {
    rb.path('delivery_id', params.delivery_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      }>;
    })
  );
}

appsRedeliverWebhookDelivery.PATH = '/app/hook/deliveries/{delivery_id}/attempts';
