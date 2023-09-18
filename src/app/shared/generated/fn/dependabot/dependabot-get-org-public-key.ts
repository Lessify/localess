/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DependabotPublicKey } from '../../models/dependabot-public-key';

export interface DependabotGetOrgPublicKey$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function dependabotGetOrgPublicKey(http: HttpClient, rootUrl: string, params: DependabotGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<DependabotPublicKey>> {
  const rb = new RequestBuilder(rootUrl, dependabotGetOrgPublicKey.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DependabotPublicKey>;
    })
  );
}

dependabotGetOrgPublicKey.PATH = '/orgs/{org}/dependabot/secrets/public-key';
