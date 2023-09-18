/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersDeleteGpgKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the GPG key.
 */
  gpg_key_id: number;
}

export function usersDeleteGpgKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersDeleteGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersDeleteGpgKeyForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.path('gpg_key_id', params.gpg_key_id, {});
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

usersDeleteGpgKeyForAuthenticatedUser.PATH = '/user/gpg_keys/{gpg_key_id}';
