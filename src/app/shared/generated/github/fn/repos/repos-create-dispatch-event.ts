/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReposCreateDispatchEvent$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * A custom webhook event name. Must be 100 characters or fewer.
 */
'event_type': string;

/**
 * JSON payload with extra information about the webhook event that your action or workflow may use. The maximum number of top-level properties is 10.
 */
'client_payload'?: {
[key: string]: any;
};
}
}

export function reposCreateDispatchEvent(http: HttpClient, rootUrl: string, params: ReposCreateDispatchEvent$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDispatchEvent.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
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

reposCreateDispatchEvent.PATH = '/repos/{owner}/{repo}/dispatches';
