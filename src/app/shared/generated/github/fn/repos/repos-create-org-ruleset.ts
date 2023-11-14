/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgRulesetConditions } from '../../models/org-ruleset-conditions';
import { RepositoryRule } from '../../models/repository-rule';
import { RepositoryRuleEnforcement } from '../../models/repository-rule-enforcement';
import { RepositoryRuleset } from '../../models/repository-ruleset';
import { RepositoryRulesetBypassActor } from '../../models/repository-ruleset-bypass-actor';

export interface ReposCreateOrgRuleset$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
  
    /**
     * Request body
     */
    body: {

/**
 * The name of the ruleset.
 */
'name': string;

/**
 * The target of the ruleset.
 */
'target'?: 'branch' | 'tag';
'enforcement': RepositoryRuleEnforcement;

/**
 * The actors that can bypass the rules in this ruleset
 */
'bypass_actors'?: Array<RepositoryRulesetBypassActor>;
'conditions'?: OrgRulesetConditions;

/**
 * An array of rules within the ruleset.
 */
'rules'?: Array<RepositoryRule>;
}
}

export function reposCreateOrgRuleset(http: HttpClient, rootUrl: string, params: ReposCreateOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
  const rb = new RequestBuilder(rootUrl, reposCreateOrgRuleset.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
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

reposCreateOrgRuleset.PATH = '/orgs/{org}/rulesets';
