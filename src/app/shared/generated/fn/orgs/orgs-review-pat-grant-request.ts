/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsReviewPatGrantRequest$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Unique identifier of the request for access via fine-grained personal access token.
 */
  pat_request_id: number;
      body: {

/**
 * Action to apply to the request.
 */
'action': 'approve' | 'deny';

/**
 * Reason for approving or denying the request. Max 1024 characters.
 */
'reason'?: string | null;
}
}

export function orgsReviewPatGrantRequest(http: HttpClient, rootUrl: string, params: OrgsReviewPatGrantRequest$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsReviewPatGrantRequest.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('pat_request_id', params.pat_request_id, {});
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

orgsReviewPatGrantRequest.PATH = '/orgs/{org}/personal-access-token-requests/{pat_request_id}';
