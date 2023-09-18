/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Integration } from '../../models/integration';

export interface AppsCreateFromManifest$Params {
  code: string;
}

export function appsCreateFromManifest(http: HttpClient, rootUrl: string, params: AppsCreateFromManifest$Params, context?: HttpContext): Observable<StrictHttpResponse<Integration & {
'client_id': string;
'client_secret': string;
'webhook_secret': string | null;
'pem': string;
[key: string]: any;
}>> {
  const rb = new RequestBuilder(rootUrl, appsCreateFromManifest.PATH, 'post');
  if (params) {
    rb.path('code', params.code, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Integration & {
      'client_id': string;
      'client_secret': string;
      'webhook_secret': string | null;
      'pem': string;
      [key: string]: any;
      }>;
    })
  );
}

appsCreateFromManifest.PATH = '/app-manifests/{code}/conversions';
