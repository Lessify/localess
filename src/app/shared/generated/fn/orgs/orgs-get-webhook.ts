/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgHook } from '../../models/org-hook';

export interface OrgsGetWebhook$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the hook.
 */
  hook_id: number;
}

export function orgsGetWebhook(http: HttpClient, rootUrl: string, params: OrgsGetWebhook$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgHook>> {
  const rb = new RequestBuilder(rootUrl, orgsGetWebhook.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('hook_id', params.hook_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrgHook>;
    })
  );
}

orgsGetWebhook.PATH = '/orgs/{org}/hooks/{hook_id}';
