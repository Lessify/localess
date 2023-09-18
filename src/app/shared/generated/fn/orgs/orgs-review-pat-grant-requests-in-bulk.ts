/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsReviewPatGrantRequestsInBulk$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * Unique identifiers of the requests for access via fine-grained personal access token. Must be formed of between 1 and 100 `pat_request_id` values.
 */
'pat_request_ids'?: Array<number>;

/**
 * Action to apply to the requests.
 */
'action': 'approve' | 'deny';

/**
 * Reason for approving or denying the requests. Max 1024 characters.
 */
'reason'?: string | null;
}
}

export function orgsReviewPatGrantRequestsInBulk(http: HttpClient, rootUrl: string, params: OrgsReviewPatGrantRequestsInBulk$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, orgsReviewPatGrantRequestsInBulk.PATH, 'post');
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

orgsReviewPatGrantRequestsInBulk.PATH = '/orgs/{org}/personal-access-token-requests';
