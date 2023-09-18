/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationActionsVariable } from '../../models/organization-actions-variable';

export interface ActionsGetOrgVariable$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the variable.
 */
  name: string;
}

export function actionsGetOrgVariable(http: HttpClient, rootUrl: string, params: ActionsGetOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationActionsVariable>> {
  const rb = new RequestBuilder(rootUrl, actionsGetOrgVariable.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('name', params.name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrganizationActionsVariable>;
    })
  );
}

actionsGetOrgVariable.PATH = '/orgs/{org}/actions/variables/{name}';
