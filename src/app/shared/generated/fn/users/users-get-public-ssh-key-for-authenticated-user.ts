/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Key } from '../../models/key';

export interface UsersGetPublicSshKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the key.
 */
  key_id: number;
}

export function usersGetPublicSshKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersGetPublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Key>> {
  const rb = new RequestBuilder(rootUrl, usersGetPublicSshKeyForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('key_id', params.key_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Key>;
    })
  );
}

usersGetPublicSshKeyForAuthenticatedUser.PATH = '/user/keys/{key_id}';
