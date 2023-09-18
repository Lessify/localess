/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsPublicKey } from '../../models/actions-public-key';

export interface ActionsGetOrgPublicKey$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsGetOrgPublicKey(http: HttpClient, rootUrl: string, params: ActionsGetOrgPublicKey$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsPublicKey>> {
  const rb = new RequestBuilder(rootUrl, actionsGetOrgPublicKey.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsPublicKey>;
    })
  );
}

actionsGetOrgPublicKey.PATH = '/orgs/{org}/actions/secrets/public-key';
