/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Email } from '../../models/email';

export interface UsersAddEmailForAuthenticatedUser$Params {
      body?: ({

/**
 * Adds one or more email addresses to your GitHub account. Must contain at least one email address. **Note:** Alternatively, you can pass a single email address or an `array` of emails addresses directly, but we recommend that you pass an object using the `emails` key.
 */
'emails': Array<string>;
} | Array<string> | string)
}

export function usersAddEmailForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: UsersAddEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Email>>> {
  const rb = new RequestBuilder(rootUrl, usersAddEmailForAuthenticatedUser.PATH, 'post');
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

usersAddEmailForAuthenticatedUser.PATH = '/user/emails';
