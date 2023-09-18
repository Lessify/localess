/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsGetDefaultWorkflowPermissions } from '../../models/actions-get-default-workflow-permissions';

export interface ActionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function actionsGetGithubActionsDefaultWorkflowPermissionsOrganization(http: HttpClient, rootUrl: string, params: ActionsGetGithubActionsDefaultWorkflowPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>> {
  const rb = new RequestBuilder(rootUrl, actionsGetGithubActionsDefaultWorkflowPermissionsOrganization.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsGetDefaultWorkflowPermissions>;
    })
  );
}

actionsGetGithubActionsDefaultWorkflowPermissionsOrganization.PATH = '/orgs/{org}/actions/permissions/workflow';
