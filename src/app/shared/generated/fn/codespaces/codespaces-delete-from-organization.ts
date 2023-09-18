/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodespacesDeleteFromOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * The name of the codespace.
 */
  codespace_name: string;
}

export function codespacesDeleteFromOrganization(http: HttpClient, rootUrl: string, params: CodespacesDeleteFromOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesDeleteFromOrganization.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('username', params.username, {});
    rb.path('codespace_name', params.codespace_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      }>;
    })
  );
}

codespacesDeleteFromOrganization.PATH = '/orgs/{org}/members/{username}/codespaces/{codespace_name}';
