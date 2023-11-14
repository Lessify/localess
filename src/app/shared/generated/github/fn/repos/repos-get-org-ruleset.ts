/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RepositoryRuleset } from '../../models/repository-ruleset';

export interface ReposGetOrgRuleset$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The ID of the ruleset.
 */
  ruleset_id: number;
}

export function reposGetOrgRuleset(http: HttpClient, rootUrl: string, params: ReposGetOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<RepositoryRuleset>> {
  const rb = new RequestBuilder(rootUrl, reposGetOrgRuleset.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('ruleset_id', params.ruleset_id, {});
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

reposGetOrgRuleset.PATH = '/orgs/{org}/rulesets/{ruleset_id}';
