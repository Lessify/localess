/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface UsersCheckFollowingForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
  target_user: string;
}

export function usersCheckFollowingForUser(http: HttpClient, rootUrl: string, params: UsersCheckFollowingForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, usersCheckFollowingForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.path('target_user', params.target_user, {});
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

usersCheckFollowingForUser.PATH = '/users/{username}/following/{target_user}';
