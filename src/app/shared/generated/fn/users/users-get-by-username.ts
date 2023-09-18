/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PrivateUser } from '../../models/private-user';
import { PublicUser } from '../../models/public-user';

export interface UsersGetByUsername$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function usersGetByUsername(http: HttpClient, rootUrl: string, params: UsersGetByUsername$Params, context?: HttpContext): Observable<StrictHttpResponse<(PrivateUser | PublicUser)>> {
  const rb = new RequestBuilder(rootUrl, usersGetByUsername.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<(PrivateUser | PublicUser)>;
    })
  );
}

usersGetByUsername.PATH = '/users/{username}';
