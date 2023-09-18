/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationActionsSecret } from '../../models/organization-actions-secret';

export interface ActionsGetOrgSecret$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function actionsGetOrgSecret(http: HttpClient, rootUrl: string, params: ActionsGetOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationActionsSecret>> {
  const rb = new RequestBuilder(rootUrl, actionsGetOrgSecret.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrganizationActionsSecret>;
    })
  );
}

actionsGetOrgSecret.PATH = '/orgs/{org}/actions/secrets/{secret_name}';
