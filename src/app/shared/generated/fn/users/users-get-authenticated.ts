/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PrivateUser } from '../../models/private-user';
import { PublicUser } from '../../models/public-user';

export interface UsersGetAuthenticated$Params {
}

export function usersGetAuthenticated(http: HttpClient, rootUrl: string, params?: UsersGetAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<(PrivateUser | PublicUser)>> {
  const rb = new RequestBuilder(rootUrl, usersGetAuthenticated.PATH, 'get');
  if (params) {
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

usersGetAuthenticated.PATH = '/user';
