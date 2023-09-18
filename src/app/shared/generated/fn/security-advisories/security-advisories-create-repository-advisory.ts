/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryAdvisory } from '../../models/repository-advisory';
import { RepositoryAdvisoryCreate } from '../../models/repository-advisory-create';

export interface SecurityAdvisoriesCreateRepositoryAdvisory$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: RepositoryAdvisoryCreate
}

export function securityAdvisoriesCreateRepositoryAdvisory(http: HttpClient, rootUrl: string, params: SecurityAdvisoriesCreateRepositoryAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryAdvisory>> {
  const rb = new RequestBuilder(rootUrl, securityAdvisoriesCreateRepositoryAdvisory.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RepositoryAdvisory>;
    })
  );
}

securityAdvisoriesCreateRepositoryAdvisory.PATH = '/repos/{owner}/{repo}/security-advisories';
