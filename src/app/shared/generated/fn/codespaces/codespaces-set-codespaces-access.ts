/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface CodespacesSetCodespacesAccess$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * Which users can access codespaces in the organization. `disabled` means that no users can access codespaces in the organization.
 */
'visibility': 'disabled' | 'selected_members' | 'all_members' | 'all_members_and_outside_collaborators';

/**
 * The usernames of the organization members who should have access to codespaces in the organization. Required when `visibility` is `selected_members`. The provided list of usernames will replace any existing value.
 */
'selected_usernames'?: Array<string>;
}
}

export function codespacesSetCodespacesAccess(http: HttpClient, rootUrl: string, params: CodespacesSetCodespacesAccess$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, codespacesSetCodespacesAccess.PATH, 'put');
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

codespacesSetCodespacesAccess.PATH = '/orgs/{org}/codespaces/access';
