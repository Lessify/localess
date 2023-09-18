/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SocialAccount } from '../../models/social-account';

export interface UsersAddSocialAccountForAuthenticatedUser$Params {
      body: {

/**
 * Full URLs for the social media profiles to add.
 */
'account_urls': Array<string>;
}
}

export function usersAddSocialAccountForAuthenticatedUser(http: HttpClient, rootUrl: string, params: UsersAddSocialAccountForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SocialAccount>>> {
  const rb = new RequestBuilder(rootUrl, usersAddSocialAccountForAuthenticatedUser.PATH, 'post');
  if (params) {
    rb.body(params.body, 'application/json');
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

usersAddSocialAccountForAuthenticatedUser.PATH = '/user/social_accounts';
