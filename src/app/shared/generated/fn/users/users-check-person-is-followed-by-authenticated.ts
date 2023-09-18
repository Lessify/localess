/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersCheckPersonIsFollowedByAuthenticated$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function usersCheckPersonIsFollowedByAuthenticated(http: HttpClient, rootUrl: string, params: UsersCheckPersonIsFollowedByAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersCheckPersonIsFollowedByAuthenticated.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
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

usersCheckPersonIsFollowedByAuthenticated.PATH = '/user/following/{username}';
