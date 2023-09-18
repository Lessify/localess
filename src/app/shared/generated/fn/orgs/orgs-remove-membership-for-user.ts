/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsRemoveMembershipForUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function orgsRemoveMembershipForUser(http: HttpClient, rootUrl: string, params: OrgsRemoveMembershipForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsRemoveMembershipForUser.PATH, 'delete');
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

orgsRemoveMembershipForUser.PATH = '/orgs/{org}/memberships/{username}';
