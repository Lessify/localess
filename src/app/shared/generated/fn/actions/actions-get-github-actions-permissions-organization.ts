/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsOrganizationPermissions } from '../../models/actions-organization-permissions';

export interface ActionsGetGithubActionsPermissionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsGetGithubActionsPermissionsOrganization(http: HttpClient, rootUrl: string, params: ActionsGetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsOrganizationPermissions>> {
  const rb = new RequestBuilder(rootUrl, actionsGetGithubActionsPermissionsOrganization.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsOrganizationPermissions>;
    })
  );
}

actionsGetGithubActionsPermissionsOrganization.PATH = '/orgs/{org}/actions/permissions';
