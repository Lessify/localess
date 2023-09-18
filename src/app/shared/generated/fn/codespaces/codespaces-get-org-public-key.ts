/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespacesPublicKey } from '../../models/codespaces-public-key';

export interface CodespacesGetOrgPublicKey$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function codespacesGetOrgPublicKey(http: HttpClient, rootUrl: string, params: CodespacesGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<CodespacesPublicKey>> {
  const rb = new RequestBuilder(rootUrl, codespacesGetOrgPublicKey.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodespacesPublicKey>;
    })
  );
}

codespacesGetOrgPublicKey.PATH = '/orgs/{org}/codespaces/secrets/public-key';
