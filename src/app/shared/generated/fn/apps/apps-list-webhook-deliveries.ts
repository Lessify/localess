/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { HookDeliveryItem } from '../../models/hook-delivery-item';

export interface AppsListWebhookDeliveries$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Used for pagination: the starting delivery from which the page of deliveries is fetched. Refer to the `link` header for the next and previous page cursors.
 */
  cursor?: string;
  redelivery?: boolean;
}

export function appsListWebhookDeliveries(http: HttpClient, rootUrl: string, params?: AppsListWebhookDeliveries$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<HookDeliveryItem>>> {
  const rb = new RequestBuilder(rootUrl, appsListWebhookDeliveries.PATH, 'get');
  if (params) {
    rb.query('per_page', params.per_page, {});
    rb.query('cursor', params.cursor, {});
    rb.query('redelivery', params.redelivery, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<HookDeliveryItem>>;
    })
  );
}

appsListWebhookDeliveries.PATH = '/app/hook/deliveries';
