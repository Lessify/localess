/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodespacesDeleteSecretForAuthenticatedUser$Params {

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function codespacesDeleteSecretForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesDeleteSecretForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, codespacesDeleteSecretForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.path('secret_name', params.secret_name, {});
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

codespacesDeleteSecretForAuthenticatedUser.PATH = '/user/codespaces/secrets/{secret_name}';
