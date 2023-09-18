/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GpgKey } from '../../models/gpg-key';

export interface UsersGetGpgKeyForAuthenticatedUser$Params {

/**
 * The unique identifier of the GPG key.
 */
  gpg_key_id: number;
}

export function usersGetGpgKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersGetGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<GpgKey>> {
  const rb = new RequestBuilder(rootUrl, usersGetGpgKeyForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('gpg_key_id', params.gpg_key_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GpgKey>;
    })
  );
}

usersGetGpgKeyForAuthenticatedUser.PATH = '/user/gpg_keys/{gpg_key_id}';
