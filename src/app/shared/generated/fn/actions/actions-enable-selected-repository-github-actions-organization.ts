/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsEnableSelectedRepositoryGithubActionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the repository.
 */
  repository_id: number;
}

export function actionsEnableSelectedRepositoryGithubActionsOrganization(http: HttpClient, rootUrl: string, params: ActionsEnableSelectedRepositoryGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsEnableSelectedRepositoryGithubActionsOrganization.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('repository_id', params.repository_id, {});
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

actionsEnableSelectedRepositoryGithubActionsOrganization.PATH = '/orgs/{org}/actions/permissions/repositories/{repository_id}';
