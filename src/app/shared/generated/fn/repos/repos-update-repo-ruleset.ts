/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryRule } from '../../models/repository-rule';
import { RepositoryRuleEnforcement } from '../../models/repository-rule-enforcement';
import { RepositoryRuleset } from '../../models/repository-ruleset';
import { RepositoryRulesetBypassActor } from '../../models/repository-ruleset-bypass-actor';
import { RepositoryRulesetConditions } from '../../models/repository-ruleset-conditions';

export interface ReposUpdateRepoRuleset$Params {

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
     * Request body
     */
    body?: {

/**
 * The name of the ruleset.
 */
'name'?: string;

/**
 * The target of the ruleset.
 */
'target'?: 'branch' | 'tag';
'enforcement'?: RepositoryRuleEnforcement;

/**
 * The actors that can bypass the rules in this ruleset
 */
'bypass_actors'?: Array<RepositoryRulesetBypassActor>;
'conditions'?: RepositoryRulesetConditions;

/**
 * An array of rules within the ruleset.
 */
'rules'?: Array<RepositoryRule>;
}
}

export function reposUpdateRepoRuleset(http: HttpClient, rootUrl: string, params: ReposUpdateRepoRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
  const rb = new RequestBuilder(rootUrl, reposUpdateRepoRuleset.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('ruleset_id', params.ruleset_id, {});
    rb.body(params.body, 'application/json');
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

reposUpdateRepoRuleset.PATH = '/repos/{owner}/{repo}/rulesets/{ruleset_id}';
