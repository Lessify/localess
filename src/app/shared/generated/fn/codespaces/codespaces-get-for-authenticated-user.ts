/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesGetForAuthenticatedUser$Params {

/**
 * The name of the codespace.
 */
  codespace_name: string;
}

export function codespacesGetForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesGetForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Codespace>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('codespace_name', params.codespace_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Codespace>;
    })
  );
}

codespacesGetForAuthenticatedUser.PATH = '/user/codespaces/{codespace_name}';
