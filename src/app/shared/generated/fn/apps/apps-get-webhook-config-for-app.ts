/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WebhookConfig } from '../../models/webhook-config';

export interface AppsGetWebhookConfigForApp$Params {
}

export function appsGetWebhookConfigForApp(http: HttpClient, rootUrl: string, params?: AppsGetWebhookConfigForApp$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
  const rb = new RequestBuilder(rootUrl, appsGetWebhookConfigForApp.PATH, 'get');
  if (params) {
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

appsGetWebhookConfigForApp.PATH = '/app/hook/config';
