/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SocialAccount } from '../../models/social-account';

export interface UsersListSocialAccountsForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function usersListSocialAccountsForUser(http: HttpClient, rootUrl: string, params: UsersListSocialAccountsForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SocialAccount>>> {
  const rb = new RequestBuilder(rootUrl, usersListSocialAccountsForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SocialAccount>>;
    })
  );
}

usersListSocialAccountsForUser.PATH = '/users/{username}/social_accounts';
