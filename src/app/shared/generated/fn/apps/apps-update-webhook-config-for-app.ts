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

export interface AppsUpdateWebhookConfigForApp$Params {
      body: {
'url'?: WebhookConfigUrl;
'content_type'?: WebhookConfigContentType;
'secret'?: WebhookConfigSecret;
'insecure_ssl'?: WebhookConfigInsecureSsl;
}
}

export function appsUpdateWebhookConfigForApp(http: HttpClient, rootUrl: string, params: AppsUpdateWebhookConfigForApp$Params, context?: HttpContext): Observable<StrictHttpResponse<WebhookConfig>> {
  const rb = new RequestBuilder(rootUrl, appsUpdateWebhookConfigForApp.PATH, 'patch');
  if (params) {
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

appsUpdateWebhookConfigForApp.PATH = '/app/hook/config';
