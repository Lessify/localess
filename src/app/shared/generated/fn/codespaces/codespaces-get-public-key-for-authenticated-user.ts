/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespacesUserPublicKey } from '../../models/codespaces-user-public-key';

export interface CodespacesGetPublicKeyForAuthenticatedUser$Params {
}

export function codespacesGetPublicKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: CodespacesGetPublicKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesUserPublicKey>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetPublicKeyForAuthenticatedUser.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodespacesUserPublicKey>;
    })
  );
}

codespacesGetPublicKeyForAuthenticatedUser.PATH = '/user/codespaces/secrets/public-key';
