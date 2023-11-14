/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryRuleset } from '../../models/repository-ruleset';

export interface ReposGetRepoRuleset$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The ID of the ruleset.
 */
  ruleset_id: number;

/**
 * Include rulesets configured at higher levels that apply to this repository
 */
  includes_parents?: boolean;
}

export function reposGetRepoRuleset(http: HttpClient, rootUrl: string, params: ReposGetRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
  const rb = new RequestBuilder(rootUrl, reposGetRepoRuleset.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('ruleset_id', params.ruleset_id, {});
    rb.query('includes_parents', params.includes_parents, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RepositoryRuleset>;
    })
  );
}

reposGetRepoRuleset.PATH = '/repos/{owner}/{repo}/rulesets/{ruleset_id}';
