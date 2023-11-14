/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReposDeleteOrgRuleset$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The ID of the ruleset.
 */
  ruleset_id: number;
}

export function reposDeleteOrgRuleset(http: HttpClient, rootUrl: string, params: ReposDeleteOrgRuleset$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reposDeleteOrgRuleset.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('ruleset_id', params.ruleset_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

reposDeleteOrgRuleset.PATH = '/orgs/{org}/rulesets/{ruleset_id}';
