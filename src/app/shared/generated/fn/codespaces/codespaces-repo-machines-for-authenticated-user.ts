/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespaceMachine } from '../../models/codespace-machine';

export interface CodespacesRepoMachinesForAuthenticatedUser$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The location to check for available machines. Assigned by IP if not provided.
 */
  location?: string;

/**
 * IP for location auto-detection when proxying a request
 */
  client_ip?: string;

/**
 * The branch or commit to check for prebuild availability and devcontainer restrictions.
 */
  ref?: string;
}

export function codespacesRepoMachinesForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesRepoMachinesForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'machines': Array<CodespaceMachine>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesRepoMachinesForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('location', params.location, {});
    rb.query('client_ip', params.client_ip, {});
    rb.query('ref', params.ref, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'machines': Array<CodespaceMachine>;
      }>;
    })
  );
}

codespacesRepoMachinesForAuthenticatedUser.PATH = '/repos/{owner}/{repo}/codespaces/machines';
