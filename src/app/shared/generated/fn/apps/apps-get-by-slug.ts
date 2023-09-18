/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Integration } from '../../models/integration';

export interface AppsGetBySlug$Params {
  app_slug: string;
}

export function appsGetBySlug(http: HttpClient, rootUrl: string, params: AppsGetBySlug$Params, context?: HttpContext): Observable<StrictHttpResponse<Integration>> {
  const rb = new RequestBuilder(rootUrl, appsGetBySlug.PATH, 'get');
  if (params) {
    rb.path('app_slug', params.app_slug, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Integration>;
    })
  );
}

appsGetBySlug.PATH = '/apps/{app_slug}';
