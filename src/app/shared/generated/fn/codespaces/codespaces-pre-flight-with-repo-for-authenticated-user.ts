/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleUser } from '../../models/simple-user';

export interface CodespacesPreFlightWithRepoForAuthenticatedUser$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The branch or commit to check for a default devcontainer path. If not specified, the default branch will be checked.
 */
  ref?: string;

/**
 * An alternative IP for default location auto-detection, such as when proxying a request.
 */
  client_ip?: string;
}

export function codespacesPreFlightWithRepoForAuthenticatedUser(http: HttpClient, rootUrl: string, params: CodespacesPreFlightWithRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'billable_owner'?: SimpleUser;
'defaults'?: {
'location': string;
'devcontainer_path': string | null;
};
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesPreFlightWithRepoForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('ref', params.ref, {});
    rb.query('client_ip', params.client_ip, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'billable_owner'?: SimpleUser;
      'defaults'?: {
      'location': string;
      'devcontainer_path': string | null;
      };
      }>;
    })
  );
}

codespacesPreFlightWithRepoForAuthenticatedUser.PATH = '/repos/{owner}/{repo}/codespaces/new';
