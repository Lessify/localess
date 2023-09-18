/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersDeletePublicSshKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the key.
 */
  key_id: number;
}

export function usersDeletePublicSshKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersDeletePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersDeletePublicSshKeyForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.path('key_id', params.key_id, {});
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

usersDeletePublicSshKeyForAuthenticatedUser.PATH = '/user/keys/{key_id}';
