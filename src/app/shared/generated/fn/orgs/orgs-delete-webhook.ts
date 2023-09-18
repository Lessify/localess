/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface OrgsDeleteWebhook$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;
}

export function orgsDeleteWebhook(http: HttpClient, rootUrl: string, params: OrgsDeleteWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, orgsDeleteWebhook.PATH, 'delete');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('hook_id', params.hook_id, {});
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

orgsDeleteWebhook.PATH = '/orgs/{org}/hooks/{hook_id}';
