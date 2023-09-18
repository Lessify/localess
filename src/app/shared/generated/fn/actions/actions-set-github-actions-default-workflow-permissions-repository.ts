/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsSetDefaultWorkflowPermissions } from '../../models/actions-set-default-workflow-permissions';

export interface ActionsSetGithubActionsDefaultWorkflowPermissionsRepository$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: ActionsSetDefaultWorkflowPermissions
}

export function actionsSetGithubActionsDefaultWorkflowPermissionsRepository(http: HttpClient, rootUrl: string, params: ActionsSetGithubActionsDefaultWorkflowPermissionsRepository$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsSetGithubActionsDefaultWorkflowPermissionsRepository.PATH, 'put');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
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

actionsSetGithubActionsDefaultWorkflowPermissionsRepository.PATH = '/repos/{owner}/{repo}/actions/permissions/workflow';
