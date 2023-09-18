/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsConvertMemberToOutsideCollaborator$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
      body?: {

/**
 * When set to `true`, the request will be performed asynchronously. Returns a 202 status code when the job is successfully queued.
 */
'async'?: boolean;
}
}

export function orgsConvertMemberToOutsideCollaborator(http: HttpClient, rootUrl: string, params: OrgsConvertMemberToOutsideCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, orgsConvertMemberToOutsideCollaborator.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('username', params.username, {});
    rb.body(params.body, 'application/json');
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

orgsConvertMemberToOutsideCollaborator.PATH = '/orgs/{org}/outside_collaborators/{username}';
