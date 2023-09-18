/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesGetCodespacesForUserInOrg$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function codespacesGetCodespacesForUserInOrg(http: HttpClient, rootUrl: string, params: CodespacesGetCodespacesForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetCodespacesForUserInOrg.PATH, 'get');
  if (params) {
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.path('org', params.org, {});
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'codespaces': Array<Codespace>;
      }>;
    })
  );
}

codespacesGetCodespacesForUserInOrg.PATH = '/orgs/{org}/members/{username}/codespaces';
