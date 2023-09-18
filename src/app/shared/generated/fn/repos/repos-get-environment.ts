/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Environment } from '../../models/environment';

export interface ReposGetEnvironment$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the environment.
 */
  environment_name: string;
}

export function reposGetEnvironment(http: HttpClient, rootUrl: string, params: ReposGetEnvironment$Params, context?: HttpContext): Observable<StrictHttpResponse<Environment>> {
  const rb = new RequestBuilder(rootUrl, reposGetEnvironment.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('environment_name', params.environment_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Environment>;
    })
  );
}

reposGetEnvironment.PATH = '/repos/{owner}/{repo}/environments/{environment_name}';
