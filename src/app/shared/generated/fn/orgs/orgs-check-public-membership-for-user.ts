/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsCheckPublicMembershipForUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function orgsCheckPublicMembershipForUser(http: HttpClient, rootUrl: string, params: OrgsCheckPublicMembershipForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsCheckPublicMembershipForUser.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

orgsCheckPublicMembershipForUser.PATH = '/orgs/{org}/public_members/{username}';
