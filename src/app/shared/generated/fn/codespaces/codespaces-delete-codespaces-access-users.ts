/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodespacesDeleteCodespacesAccessUsers$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The usernames of the organization members whose codespaces should not be billed to the organization.
 */
'selected_usernames': Array<string>;
}
}

export function codespacesDeleteCodespacesAccessUsers(http: HttpClient, rootUrl: string, params: CodespacesDeleteCodespacesAccessUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, codespacesDeleteCodespacesAccessUsers.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
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

codespacesDeleteCodespacesAccessUsers.PATH = '/orgs/{org}/codespaces/access/selected_users';
