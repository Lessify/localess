/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsUpdatePatAccess$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the fine-grained personal access token.
 */
  pat_id: number;
      body: {

/**
 * Action to apply to the fine-grained personal access token.
 */
'action': 'revoke';
}
}

export function orgsUpdatePatAccess(http: HttpClient, rootUrl: string, params: OrgsUpdatePatAccess$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsUpdatePatAccess.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('pat_id', params.pat_id, {});
    rb.body(params.body, 'application/json');
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

orgsUpdatePatAccess.PATH = '/orgs/{org}/personal-access-tokens/{pat_id}';
