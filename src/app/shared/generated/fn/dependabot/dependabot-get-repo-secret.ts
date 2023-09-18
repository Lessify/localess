/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DependabotSecret } from '../../models/dependabot-secret';

export interface DependabotGetRepoSecret$Params {

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

export function dependabotGetRepoSecret(http: HttpClient, rootUrl: string, params: DependabotGetRepoSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotSecret>> {
  const rb = new RequestBuilder(rootUrl, dependabotGetRepoSecret.PATH, 'get');
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
      return r as StrictHttpResponse<DependabotSecret>;
    })
  );
}

dependabotGetRepoSecret.PATH = '/repos/{owner}/{repo}/dependabot/secrets/{secret_name}';
