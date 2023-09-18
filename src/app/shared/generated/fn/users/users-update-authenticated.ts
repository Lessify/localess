/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PrivateUser } from '../../models/private-user';

export interface UsersUpdateAuthenticated$Params {
      body?: {

/**
 * The new name of the user.
 */
'name'?: string;

/**
 * The publicly visible email address of the user.
 */
'email'?: string;

/**
 * The new blog URL of the user.
 */
'blog'?: string;

/**
 * The new Twitter username of the user.
 */
'twitter_username'?: string | null;

/**
 * The new company of the user.
 */
'company'?: string;

/**
 * The new location of the user.
 */
'location'?: string;

/**
 * The new hiring availability of the user.
 */
'hireable'?: boolean;

/**
 * The new short biography of the user.
 */
'bio'?: string;
}
}

export function usersUpdateAuthenticated(http: HttpClient, rootUrl: string, params?: UsersUpdateAuthenticated$Params, context?: HttpContext): Observable<StrictHttpResponse<PrivateUser>> {
  const rb = new RequestBuilder(rootUrl, usersUpdateAuthenticated.PATH, 'patch');
  if (params) {
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PrivateUser>;
    })
  );
}

usersUpdateAuthenticated.PATH = '/user';
