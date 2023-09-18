/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GpgKey } from '../../models/gpg-key';

export interface UsersCreateGpgKeyForAuthenticatedUser$Params {
      body: {

/**
 * A descriptive name for the new key.
 */
'name'?: string;

/**
 * A GPG key in ASCII-armored format.
 */
'armored_public_key': string;
}
}

export function usersCreateGpgKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersCreateGpgKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<GpgKey>> {
  const rb = new RequestBuilder(rootUrl, usersCreateGpgKeyForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
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

usersCreateGpgKeyForAuthenticatedUser.PATH = '/user/gpg_keys';
