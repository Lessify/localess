/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespacesSecret } from '../../models/codespaces-secret';

export interface CodespacesGetSecretForAuthenticatedUser$Params {

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function codespacesGetSecretForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesGetSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesSecret>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetSecretForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodespacesSecret>;
    })
  );
}

codespacesGetSecretForAuthenticatedUser.PATH = '/user/codespaces/secrets/{secret_name}';
