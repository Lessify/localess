/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Email } from '../../models/email';

export interface UsersSetPrimaryEmailVisibilityForAuthenticatedUser$Params {
      body: {

/**
 * Denotes whether an email is publicly visible.
 */
'visibility': 'public' | 'private';
}
}

export function usersSetPrimaryEmailVisibilityForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersSetPrimaryEmailVisibilityForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
  const rb = new RequestBuilder(rootUrl, usersSetPrimaryEmailVisibilityForAuthenticatedUser.PATH, 'patch');
  if (params) {
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Email>>;
    })
  );
}

usersSetPrimaryEmailVisibilityForAuthenticatedUser.PATH = '/user/email/visibility';
