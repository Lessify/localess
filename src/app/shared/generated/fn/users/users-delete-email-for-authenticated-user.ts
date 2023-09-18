/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersDeleteEmailForAuthenticatedUser$Params {
      body?: ({

/**
 * Email addresses associated with the GitHub user account.
 */
'emails': Array<string>;
} | Array<string> | string)
}

export function usersDeleteEmailForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: UsersDeleteEmailForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersDeleteEmailForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.body(params.body, 'application/json');
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

usersDeleteEmailForAuthenticatedUser.PATH = '/user/emails';
