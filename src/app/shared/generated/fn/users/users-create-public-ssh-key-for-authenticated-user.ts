/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Key } from '../../models/key';

export interface UsersCreatePublicSshKeyForAuthenticatedUser$Params {
      body: {

/**
 * A descriptive name for the new key.
 */
'title'?: string;

/**
 * The public SSH key to add to your GitHub account.
 */
'key': string;
}
}

export function usersCreatePublicSshKeyForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersCreatePublicSshKeyForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Key>> {
  const rb = new RequestBuilder(rootUrl, usersCreatePublicSshKeyForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
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

usersCreatePublicSshKeyForAuthenticatedUser.PATH = '/user/keys';
