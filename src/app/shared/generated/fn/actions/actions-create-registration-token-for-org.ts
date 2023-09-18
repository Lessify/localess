/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AuthenticationToken } from '../../models/authentication-token';

export interface ActionsCreateRegistrationTokenForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsCreateRegistrationTokenForOrg(http: HttpClient, rootUrl: string, params: ActionsCreateRegistrationTokenForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<AuthenticationToken>> {
  const rb = new RequestBuilder(rootUrl, actionsCreateRegistrationTokenForOrg.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<AuthenticationToken>;
    })
  );
}

actionsCreateRegistrationTokenForOrg.PATH = '/orgs/{org}/actions/runners/registration-token';
