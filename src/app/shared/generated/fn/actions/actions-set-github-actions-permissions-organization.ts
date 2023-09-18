/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { AllowedActions } from '../../models/allowed-actions';
import { EnabledRepositories } from '../../models/enabled-repositories';

export interface ActionsSetGithubActionsPermissionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {
'enabled_repositories': EnabledRepositories;
'allowed_actions'?: AllowedActions;
}
}

export function actionsSetGithubActionsPermissionsOrganization(http: HttpClient, rootUrl: string, params: ActionsSetGithubActionsPermissionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsSetGithubActionsPermissionsOrganization.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
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

actionsSetGithubActionsPermissionsOrganization.PATH = '/orgs/{org}/actions/permissions';
