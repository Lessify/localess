/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersDeleteSshSigningKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the SSH signing key.
 */
  ssh_signing_key_id: number;
}

export function usersDeleteSshSigningKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersDeleteSshSigningKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersDeleteSshSigningKeyForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.path('ssh_signing_key_id', params.ssh_signing_key_id, {});
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

usersDeleteSshSigningKeyForAuthenticatedUser.PATH = '/user/ssh_signing_keys/{ssh_signing_key_id}';
