/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepoCodespacesSecret } from '../../models/repo-codespaces-secret';

export interface CodespacesGetRepoSecret$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function codespacesGetRepoSecret(http: HttpClient, rootUrl: string, params: CodespacesGetRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<RepoCodespacesSecret>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetRepoSecret.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RepoCodespacesSecret>;
    })
  );
}

codespacesGetRepoSecret.PATH = '/repos/{owner}/{repo}/codespaces/secrets/{secret_name}';
