/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface AppsDeleteToken$Params {

/**
 * The client ID of the GitHub app.
 */
  client_id: string;
      body: {

/**
 * The OAuth access token used to authenticate to the GitHub API.
 */
'access_token': string;
}
}

export function appsDeleteToken(http: HttpClient, rootUrl: string, params: AppsDeleteToken$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, appsDeleteToken.PATH, 'delete');
  if (params) {
    rb.path('client_id', params.client_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

appsDeleteToken.PATH = '/applications/{client_id}/token';
