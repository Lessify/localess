/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsUpdatePatAccesses$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * Action to apply to the fine-grained personal access token.
 */
'action': 'revoke';

/**
 * The IDs of the fine-grained personal access tokens.
 */
'pat_ids': Array<number>;
}
}

export function orgsUpdatePatAccesses(http: HttpClient, rootUrl: string, params: OrgsUpdatePatAccesses$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, orgsUpdatePatAccesses.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      }>;
    })
  );
}

orgsUpdatePatAccesses.PATH = '/orgs/{org}/personal-access-tokens';
